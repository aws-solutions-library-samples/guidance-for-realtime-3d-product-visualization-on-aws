// @license
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
//
// This file is responsible for finding nearest provisioned streaming infra.
import * as log from 'ts-app-logger';

export const findNearestAwsRegion = (
  coordinates: ICoordinates,
  regionsWeCareAbout?: string[] // Limit "nearest" to provisioned resources.
): IAwsRegion | undefined => {

  const regionsToCheck = regionsWeCareAbout 
    ? supportedAmazonGameliftRegions.filter(region => regionsWeCareAbout.includes(region.code))
    : supportedAmazonGameliftRegions;

  if (regionsToCheck.length === 0) {
    log.warn('no valid regions to check, are regionsWeCareAbout valid region codes?');

    return;
  }

  // TODO Remove
  // Find nearest region using haversine formula.
  return regionsToCheck.reduce((nearest, current) => {
    const distanceToCurrent = calculateDistance(
      coordinates,
      current.location
    );
    
    const distanceToNearest = calculateDistance(
      coordinates,
      nearest.location
    );

    return distanceToCurrent < distanceToNearest ? current : nearest;
  });
}

// See: https://aws.amazon.com/about-aws/global-infrastructure/regions_az/
export const supportedAmazonGameliftRegions: IAwsRegion[] = [
  // North America
  // { name: 'US East (N. Virginia)', code: 'us-east-1', location: { latitude: 38.13, longitude: -78.45 } },
  { name: 'US East (Ohio)', code: 'us-east-2', location: { latitude: 39.96, longitude: -83.00 } },
  // { name: 'US West (N. California)', code: 'us-west-1', location: { latitude: 37.35, longitude: -121.96 } },
  { name: 'US West (Oregon)', code: 'us-west-2', location: { latitude: 46.15, longitude: -123.88 } },
  // { name: 'Canada (Central)', code: 'ca-central-1', location: { latitude: 45.50, longitude: -73.57 } },

  // South America
  // { name: 'South America (São Paulo)', code: 'sa-east-1', location: { latitude: -23.55, longitude: -46.63 } },

  // Europe
  // { name: 'Europe (Ireland)', code: 'eu-west-1', location: { latitude: 53.33, longitude: -6.25 } },
  // { name: 'Europe (London)', code: 'eu-west-2', location: { latitude: 51.51, longitude: -0.13 } },
  // { name: 'Europe (Paris)', code: 'eu-west-3', location: { latitude: 48.86, longitude: 2.35 } },
  { name: 'Europe (Frankfurt)', code: 'eu-central-1', location: { latitude: 50.12, longitude: 8.68 } },
  // { name: 'Europe (Milan)', code: 'eu-south-1', location: { latitude: 45.46, longitude: 9.19 } },
  // { name: 'Europe (Stockholm)', code: 'eu-north-1', location: { latitude: 59.33, longitude: 18.07 } },
  // { name: 'Europe (Zurich)', code: 'eu-central-2', location: { latitude: 47.37, longitude: 8.55 } },
  // { name: 'Europe (Spain)', code: 'eu-south-2', location: { latitude: 40.42, longitude: -3.70 } },

  // Asia Pacific
  { name: 'Asia Pacific (Tokyo)', code: 'ap-northeast-1', location: { latitude: 35.69, longitude: 139.69 } },
  // { name: 'Asia Pacific (Seoul)', code: 'ap-northeast-2', location: { latitude: 37.57, longitude: 126.98 } },
  // { name: 'Asia Pacific (Osaka)', code: 'ap-northeast-3', location: { latitude: 34.69, longitude: 135.50 } },
  // { name: 'Asia Pacific (Singapore)', code: 'ap-southeast-1', location: { latitude: 1.29, longitude: 103.86 } },
  // { name: 'Asia Pacific (Sydney)', code: 'ap-southeast-2', location: { latitude: -33.87, longitude: 151.21 } },
  // { name: 'Asia Pacific (Jakarta)', code: 'ap-southeast-3', location: { latitude: -6.21, longitude: 106.85 } },
  // { name: 'Asia Pacific (Melbourne)', code: 'ap-southeast-4', location: { latitude: -37.81, longitude: 144.96 } },
  // { name: 'Asia Pacific (Hyderabad)', code: 'ap-south-2', location: { latitude: 17.39, longitude: 78.49 } },
  // { name: 'Asia Pacific (Mumbai)', code: 'ap-south-1', location: { latitude: 19.08, longitude: 72.88 } },
  // { name: 'Asia Pacific (Hong Kong)', code: 'ap-east-1', location: { latitude: 22.27, longitude: 114.17 } },

  // Middle East
  // { name: 'Middle East (Bahrain)', code: 'me-south-1', location: { latitude: 26.07, longitude: 50.56 } },
  // { name: 'Middle East (UAE)', code: 'me-central-1', location: { latitude: 25.09, longitude: 55.17 } },

  // Africa
  // { name: 'Africa (Cape Town)', code: 'af-south-1', location: { latitude: -33.92, longitude: 18.42 } },

  // China
  // { name: 'China (Beijing)', code: 'cn-north-1', location: { latitude: 39.91, longitude: 116.39 } },
  // { name: 'China (Ningxia)', code: 'cn-northwest-1', location: { latitude: 38.47, longitude: 106.27 } },

  // AWS GovCloud (US)
  // { name: 'AWS GovCloud (US-East)', code: 'us-gov-east-1', location: { latitude: 37.32, longitude: -78.45 } },
  // { name: 'AWS GovCloud (US-West)', code: 'us-gov-west-1', location: { latitude: 37.35, longitude: -121.96 } },
];

interface IAwsRegion {
  name: string;
  code: string;
  location: ICoordinates;
}

interface ICoordinates {
  latitude: number;
  longitude: number;
}

function calculateDistance(coord1: ICoordinates, coord2: ICoordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}