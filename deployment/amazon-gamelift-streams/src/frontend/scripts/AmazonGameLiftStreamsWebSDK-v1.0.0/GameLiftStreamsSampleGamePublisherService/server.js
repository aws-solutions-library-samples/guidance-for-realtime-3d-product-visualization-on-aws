const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { GameLiftStreams } = require('@aws-sdk/client-gameliftstreams');

// Configuration variables
const STREAM_CONNECTION_TIMEOUT_SECONDS = 600;
const LISTEN_PORT_HTTP = 8000;
const LISTEN_PORT_HTTPS = 8443;
const TLS_KEYFILE = 'server.key'; // note: if not found, HTTPS is disabled
const TLS_CRTFILE = 'server.crt'; // note: if not found, HTTPS is disabled

// Load shared AWS CLI config file, enable command-line overrides for region and profile
process.env.AWS_SDK_LOAD_CONFIG = '1';
applyCommandLineEnvOverride('--region', 'AWS_REGION');
applyCommandLineEnvOverride('--profile', 'AWS_PROFILE');

// Configure AWS SDK for keep-alive reuse of HTTPS connections
// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-reusing-connections.html
process.env.AWS_NODEJS_CONNECTION_REUSE_ENABLED = '1';

// Disable annoying "maintenance mode" console message
process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = '1';

// Initialize GameLiftStreams client
const gameliftstreams = new GameLiftStreams({
});

if (!gameliftstreams.config.region) {
    console.error('Unable to determine region, use "aws configure" or specify --region parameter');
    process.exit(1);
}

// Create a simple web server based on the static contents of public/
const app = express();
app.use(express.static('public'));

// Enable parsing of JSON request bodies
app.use(express.json())

// Keep a simple in-memory "database" which maps unique connection tokens
// to a {StreamGroupId, StreamSessionArn, Timestamp} connection object.
const connectionDatabase = {};

// This error code is generally indicating an error occuring in server.
// Error details could be fetched either in browser or console
const generalErrorStatusCode = 502;

// Expose a "start stream session" API which returns an opaque connection
// token that uniquely identifies a specific client connection attempt.
app.post('/api/CreateStreamSession', function (req, res) {
    console.log(`CreateStreamSession request received: ${JSON.stringify(req.body)}`);

    // Ideally your backend server will validate all of these configuration parameters,
    // or ignore the client and look up predetermined values from a configuration table.
    // You likely want to override AdditionalLaunchArgs/AdditionalEnvironmentVariables.
    // At the very least, you should authenticate the user id and stream group ids here.
    // You should never trust the client! But we will trust the client for the purposes
    // of this very simple demo application.
    const requestData = {
        Identifier: req.body.StreamGroupId,
        AdditionalLaunchArgs: req.body.AdditionalLaunchArgs,
        AdditionalEnvironmentVariables: req.body.AdditionalEnvironmentVariables,
        UserId: req.body.UserId,
        Protocol: 'WebRTC',
        SignalRequest: req.body.SignalRequest,
        ConnectionTimeoutSeconds: STREAM_CONNECTION_TIMEOUT_SECONDS,
        SessionLengthSeconds: 12*3600, // Note: GameLiftStreams stream duration limit at 24 hours
        ApplicationIdentifier: req.body.ApplicationIdentifier, // Note: Optional field for multi-app feature
        Locations: req.body.Locations, // Note: Optional field for multi-region feature
    };

    gameliftstreams.startStreamSession(requestData, (err, data) => {
        if (err) {
            console.log(`CreateStreamSession -> StartStreamSession ERROR: ${err}`);
            res.status(generalErrorStatusCode);
            res.json({});
        } else {
            console.log(`CreateStreamSession -> StartStreamSession SUCCESS: Arn=${JSON.stringify(data.Arn)}`);
            console.debug(data);
            // Generate a unique private token that can be used to query for a signal response
            const connectionId = crypto.randomUUID();
            connectionDatabase[connectionId] = {
                StreamGroupId: req.body.StreamGroupId,
                StreamSessionArn: data.Arn,
                Timestamp: Date.now()
            };
            res.json({ Token: connectionId });
            // Purge the token and related state after 24 hours (longest possible stream duration)
            setTimeout(() => { delete connectionDatabase[connectionId]; }, /*milliseconds per day*/ 24*60*60*1000);
        }
    });
});

// Expose a "get signal response" API which takes an opaque connection token
// and returns the signal response to complete the connection, if it is ready
app.post('/api/GetSignalResponse', function (req, res) {
    console.log(`GetSignalResponse request received: ${JSON.stringify(req.body)}`);

    const connectionData = req.body.Token && connectionDatabase[req.body.Token];
    if (!connectionData) {
        console.log('GetSignalResponse connection token is not recognized');
        res.status(404); // HTTP 404 indicates Token Not Found
        res.json({});
        return;
    }
    if (Date.now() - connectionData.Timestamp > STREAM_CONNECTION_TIMEOUT_SECONDS * 1000) {
        console.log('GetSignalResponse connection token is too old, connection attempt is no longer valid');
        res.status(404); // HTTP 404 indicates Token Not Found (or in this case, expired)
        res.json({});
        return;
    }

    const requestData = {
        Identifier: connectionData.StreamGroupId,
        StreamSessionIdentifier: connectionData.StreamSessionArn,
    };

    gameliftstreams.getStreamSession(requestData, (err, data) => {
        if (err) {
            console.log(`GetSignalResponse -> GetStreamSession ERROR: ${err}`);
            res.status(generalErrorStatusCode);
            res.json({});
        } else {
            console.log(`GetSignalResponse -> GetStreamSession SUCCESS: Status=${data.Status}`);
            if (data.Status === 'ACTIVATING') {
                // Stream is not ready yet, client must check again later
                res.json({ SignalResponse: '' });
            } else if (data.Status === 'ACTIVE') {
                // Forward SignalResponse so client can connect to stream
                console.debug(JSON.stringify(data));
                res.json({ SignalResponse: data.SignalResponse });
            } else {
                // Any other status is invalid for client connection
                console.debug(JSON.stringify(data));
                res.status(404);
                res.json({});
            }
        }
    });
});

// Expose a "reconnect stream session" API which synchronously reconnects to an
// existing stream, based on the private connection token which was originally
// sent to the client by CreateStreamSesssion. This operation is much faster than
// starting a new stream and should complete a few seconds at most.
app.post('/api/ReconnectStreamSession', function (req, res) {
    console.log(`ReconnectStreamSession request received: ${JSON.stringify(req.body)}`);

    // For simplicity, we treat knowledge of a valid connection token as authorization.
    // This is a very simple authentication model, and relies on keeping tokens secret,
    // which users might not do! They could share browser URLs, or use a shared system
    // which leaves the client connection token around somewhere on disk.
    // You will want to add additional authentication and authorization checks here.

    // Lookup private unique connection token in "database"
    const connectionData = req.body.Token && connectionDatabase[req.body.Token];
    if (!connectionData) {
        console.log('ReconnectStreamSession connection token is not recognized');
        res.status(404);
        res.json({});
        return;
    }
    console.debug('connection data from token: ' + JSON.stringify(connectionData));

    // Transform session connection data into a new connection request
    const requestData = {
        Identifier: connectionData.StreamGroupId,
        StreamSessionIdentifier: connectionData.StreamSessionArn,
        SignalRequest: req.body.SignalRequest,
    };

    gameliftstreams.createStreamSessionConnection(requestData, (err, data) => {
        if (err) {
            console.log(`ReconnectStreamSession -> CreateStreamSessionConnection ERROR: ${err}`);
            res.status(generalErrorStatusCode);
            res.json({});
        } else {
            console.log(`ReconnectStreamSession -> CreateStreamSessionConnection SUCCESS: Arn=${JSON.stringify(req.body.StreamSessionId)}`);
            console.debug(data);
            // Return the new signal response for the client to complete reconnection
            res.json({ SignalResponse: data.SignalResponse });
        }
    });
});

// Expose a "destroy stream session" API which calls TerminateStreamSession to
// asynchronously end an existing stream, based on the private connection token
// which was originally sent to the client by CreateStreamSesssion.
app.post('/api/DestroyStreamSession', function (req, res) {
    console.log(`DestroyStreamSession request received: ${JSON.stringify(req.body)}`);

    // For simplicity, we treat knowledge of a valid connection token as authorization.
    // This is a very simple authentication model, and relies on keeping tokens secret,
    // which users might not do! They could share browser URLs, or use a shared system
    // which leaves the client connection token around somewhere on disk.
    // You will want to add additional authentication and authorization checks here.

    // Lookup private unique connection token in "database"
    const connectionData = req.body.Token && connectionDatabase[req.body.Token];
    if (!connectionData) {
        console.log('DestroyStreamSession connection token is not recognized');
        res.status(404);
        res.json({});
        return;
    }
    console.debug('connection data from token: ' + JSON.stringify(connectionData));

    const requestData = {
        Identifier: connectionData.StreamGroupId,
        StreamSessionIdentifier: connectionData.StreamSessionArn,
    };
    gameliftstreams.terminateStreamSession(requestData, (err, data) => {
        if (err) {
            console.log(`DestroyStreamSession -> TerminateStreamSession ERROR: ${err}`);
            res.status(generalErrorStatusCode);
            res.json({});
        } else {
            console.log(`DestroyStreamSession -> TerminateStreamSession SUCCESS: Arn=${JSON.stringify(connectionData.StreamSessionArn)}`);
            res.json({});

            // Purge the connection token immediately; clients can't make other
            // requests now that the stream has moved to TERMINATING status.
            delete connectionDatabase[req.body.Token];
        }
    });
});

// Create HTTPS server and listen for requests, if private key and certificate can be loaded
let key, cert;
try { key = fs.readFileSync(TLS_KEYFILE, 'utf8'); } catch { }
try { cert = fs.readFileSync(TLS_CRTFILE, 'utf8'); } catch { }
if (key && cert) {
    // Create https server
    httpsServer = https.createServer({key, cert}, app);

    // Test if port is open for IPV4 first
    httpsServer.listen(LISTEN_PORT_HTTPS, '0.0.0.0', (err) => {
        if (!err) {
            // Close server and continue
            httpsServer.close();
        }
        // Test if port is open for IPV6 next
        httpsServer.listen(LISTEN_PORT_HTTPS, (err) => {
            if (err) {
                throw err;
            }
            // Only start server if neither protocol throws an error for given port
            console.log(`Listening on HTTPS port ${LISTEN_PORT_HTTPS}`)
        })
    });
} else {
    console.log('Unable to load TLS certificate and private key for HTTPS');
}

// Create HTTP server
httpServer = http.createServer(app);

// Test if port is open for IPV4 first
httpServer.listen(LISTEN_PORT_HTTP, '0.0.0.0', (err) => {
    if (!err) {
        // Close server and continue
        httpServer.close();
    }
    // Test if port is open for IPV6 next
    httpServer.listen(LISTEN_PORT_HTTP, (err) => {
        if (err) {
            throw err;
        }
        // Only start server if neither protocol throws an error for given port
        console.log(`Listening on HTTP port ${LISTEN_PORT_HTTP}`)
    })
});


// Helper functions for command-line parsing
function getCommandLineValue(param) {
    const idx = process.argv.indexOf(param);
    return idx == -1 ? undefined : process.argv[idx+1];
}
function applyCommandLineEnvOverride(param, key) {
    const val = getCommandLineValue(param)
    if (val) {
        process.env[key] = val
    }
    return val
}
