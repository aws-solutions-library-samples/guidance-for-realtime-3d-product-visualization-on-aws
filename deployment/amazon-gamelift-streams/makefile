# @license
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# This file is responsible for defining developer commands.
include makefile.inc
stage := local

# Include environment configuration.
ifneq (,$(wildcard ./config/.env))
	include ./config/.env
	export
endif

# Lowest supported browser targets for ESM: https://caniuse.com/?search=ESM
supported_esbuild_browser_targets := chrome60,firefox60,safari11,edge18

# Repolinter is ran locally as part of the sample release process.
repolinter_rules_path := /Users/$(shell whoami)/Downloads/amazon-ospo-ruleset.json

# Fortify is ran locally as part of the sample release process.
fortify_install_path := /Applications/Fortify/Fortify_SCA_and_Apps_22.1.1
fortify_license_path := /Users/$(shell whoami)/Downloads/fortify.license

# Allowed licenses in NPM ecosystem.
allowed_licenses := MIT;Apache-2.0;Apache 2.0;BSD-2-Clause;BSD-3-Clause;BSD*;0BSD;ISC;Python-2.0;CC-BY-4.0;CC-BY-3.0;CC0-1.0;Unlicense;WTFPL

setup:
# We had issues with NPM picking up changes to these packages due to how packages pulled from Github are cached.
# If you run into the same issues, uncomment the lines below.	
	npm uninstall -g ts-npm

# These packages need to be installed globally.
	npm install -g "github:tsapporg/ts-npm#f1f6e4c6cead9ae5f8877f25da5ff85382079c5c" # Used to install npm packages from npm*.ts files, requires global install ATM.

install:
# This generates package.json from our ./.npm/npm*.ts files. 
# A pre-generated package.json file is stored with this source in case you have issues finding global NPM modules on PATH.
	ts-npm --action=install --absolute-path-to-dependencies=$(shell pwd)/.npm || npm install

develop/website:
	make target=web build/frontend

	npx concurrently --kill-others \
		"make develop/watch/styles" \
		"make develop/watch/scripts" \
		"make develop/watch/bundle/website" \
		"make develop/watch/html" \
		"make develop/watch/public" \
		"npx livereload --debug --wait 1000 ${frontend_dist_dir}/" \
		"make serve" \
		--success "!command-{name}"/"!command-{index}"

build/frontend:
	make clean/frontend

	make node_env=$(node_env) build/styles
	make target=$(target) node_env=$(node_env) build/scripts
	make node_env=$(node_env) build/dependencies/styles
	make \
		node_env=$(node_env) \
		stage=$(stage) \
		app_location=$(app_location) \
		aws_waf_api_key="$(aws_waf_api_key)" \
		aws_waf_captcha_integration_url="$(aws_waf_captcha_integration_url)" \
		build/html
	make build/public
	
clean/frontend:
	npx shx rm -rf ./${frontend_dist_dir}

build/styles:
	npx shx mkdir -p ./${frontend_dist_dir}

	npx esbuild ./src/frontend/styles/index.css \
		--external:*.woff --external:*.woff2 --external:*.eot --external:*.ttf --external:*.svg --external:*#iefix --external:*.png --external:*#Roboto \
		--bundle --outfile=./${frontend_dist_dir}/bundle.css

build/scripts:
	make node_env=$(node_env) compile/scripts
	make target=$(target) node_env=$(node_env) bundle/scripts/website

compile/scripts:
	npx cross-env NODE_ENV=$(node_env) npx tsc $(watch_flag)--project ./config/tsconfig.frontend.json

bundle/scripts/website:		
# FIXME esbuild fails to resolve ./AmazonGameLiftStreamsWebSDK-v1.0.0/gameliftstreams-1.0.0 .
# Set as external and just append to bundle file.
# FIXME When dotenv requires some of these browserified deps:
# --alias:buffer=buffer \
# --alias:path=path-browserify \
# --alias:fs=browserify-fs \
# --alias:stream=stream-browserify \
# --alias:crypto=crypto-browserify \
# --alias:assert=assert-browserify \
# --alias:os=os-browserify \
# --alias:constants=constants-browserify
	npx esbuild ./${frontend_dist_dir}/frontend/scripts/index.js $(watch_flag)--bundle \
		--sourcemap \
		--define:global=window \
		--loader:.ttf=file \
		--resolve-extensions=.ts,.js,.css,.json,.mjs \
		--external:./AmazonGameLiftStreamsWebSDK-v1.0.0/gameliftstreams-1.0.0.js \
		--target=${supported_esbuild_browser_targets} \
		--outfile=./${frontend_dist_dir}/bundle.frontend.js

	cp ./src/frontend/scripts/AmazonGameLiftStreamsWebSDK-v1.0.0/gameliftstreams-1.0.0.js ./${frontend_dist_dir}/gameliftstreams-1.0.0.js

build/dependencies/styles:
	npx shx mkdir -p ./${frontend_dist_dir}
	npx clean-css-cli --output ./${frontend_dist_dir}/deps.css \
		./node_modules/normalize.css/normalize.css
	
build/html:
	npx shx mkdir -p ./${frontend_dist_dir}/posts

	make \
		node_env=$(node_env) \
		stage=$(stage) \
		app_location=$(app_location) \
		aws_waf_api_key="$(aws_waf_api_key)" \
		aws_waf_captcha_integration_url="$(aws_waf_captcha_integration_url)" \
		build/html/website

build/html/website:
	npx cross-env NODE_ENV=$(node_env) node \
		--experimental-specifier-resolution=node --experimental-modules --no-warnings --import $(ts_exec_tsx) \
		./build-utils/scripts/build-html.ts \
		--stage="$(stage)" \
		--app-location="$(app_location)" \
		--aws-waf-api-key="$(aws_waf_api_key)" \
		--aws-waf-captcha-integration-url="$(aws_waf_captcha_integration_url)"

build/public:
	rsync -av --progress src/frontend/public/ ${frontend_dist_dir}/

develop/watch/styles:
	npx onchange -v -k "src/frontend/styles/**/*.css" -- make build/styles

develop/watch/scripts:
	make watch_flag="--watch " compile/scripts

develop/watch/bundle/website:
	make target=$(target) watch_flag="--watch " bundle/scripts/website

develop/watch/html:
	npx onchange -v -k "src/frontend/**/*.ejs" "src/frontend/**/*.md" "src/frontend/**/*.csv" "src/frontend/**/*.yaml" -- make build/html

develop/watch/public:
	npx onchange -v -k "src/frontend/public/**/*" -- make build/public

serve:
	make package/edge

	npx ws \
		--stack lws-basic-auth \
    --stack lws-body-parser \
    --stack lws-request-monitor \
    --stack lws-log \
    --stack lws-cors \
    --stack lws-json \
    --stack lws-compress \
    --stack lws-rewrite \
    --stack lws-blacklist \
    --stack lws-conditional-get \
    --stack lws-mime \
    --stack lws-range \
    --stack lws-spa \
    --stack lws-static \
    --stack lws-index \
		--stack ./src/edge/infra.local.js \
		--port 8080 --directory $(frontend_dist_dir) --cors.origin "*" --cors.allow-methods "*" --open

package/edge:
	make clean/edge

	make \
		node_env=$(node_env) \
		npm_file=./.npm/npm.edge.ts \
		src_dir=$(shell pwd)/src/edge \
		dist_dir=$(shell pwd)/$(edge_dist_dir) \
		tsconfig_path=./config/tsconfig.edge.json \
		dist_src_path=$(shell pwd)/$(edge_dist_dir)/edge \
		bundle-typescript-src-for-aws-lambda;

clean/edge:
	make src_dir=./src/edge dist_dir=$(shell pwd)/$(edge_dist_dir) clean-bundled-typescript

clean-bundled-typescript:
	make dist_dir=$(edge_dir) clean-bundled-typescript-dist
	make src_dir=$(src_dir) clean-bundled-typescript-src
clean-bundled-typescript-dist:
	rm -rf $(dist_dir)
clean-bundled-typescript-src:
	rm -rf $(src_dir)/node_modules
	rm -f $(src_dir)/npm*.ts 
	rm -f $(src_dir)/package.json 
	rm -f $(src_dir)/package-lock.json

# We write Lambda functions in infra.aws.ts files in the src/**/* folders and bundle the source referenced in that file. 
bundle-typescript-src-for-aws-lambda:
	npx shx rm -rf $(dist_dir); mkdir $(dist_dir)
	npx shx cp ./.npm/npm.ts $(dist_dir)/npm.ts
	npx shx cp $(npm_file) $(dist_dir)/npm.package.ts
	
# Install dependencies and compile TypeScript.
	cd $(dist_dir); ts-npm --action=install --absolute-path-to-dependencies=$(dist_dir);
	npx cross-env NODE_ENV=$(node_env) npx tsc --project $(tsconfig_path)
	ls -al $(dist_dir)

	npx esbuild $(dist_src_path)/infra.aws.js \
		--platform=node --bundle --target=$(node_target) --format=esm --inject:./build-utils/scripts/cjs-shim.ts --outfile=$(dist_dir)/infra_aws_bundle.mjs
	cat $(dist_dir)/infra_aws_bundle.mjs | node ./build-utils/scripts/importify-esbuild-output.cjs > $(dist_dir)/infra_aws_bundle_importified.mjs

publish-sample:
	make add-license-header-to-files
	make scan

add-license-header-to-files:
	npx source-licenser --config-file ./config/source-licenser.yaml './'

scan:
	make lint/repo
	make scan/licenses
	make scan/source
	make stage=main scan/cloudformation-templates
	make generate-license-report

lint/repo:
	NODE_OPTIONS=max-old-space-size=127284016 node $(shell pwd)/node_modules/repolinter/bin/repolinter.js lint --dryRun -r $(repolinter_rules_path) \
		--allowPaths $(shell pwd)/src \
		.
scan/licenses:
# License notes:
# * Packages jackspeak@3.4.3, path-scurry@1.11.1, package-json-from-dist@1.0.1 specify BlueOak-1.0.0 license, see: https://blueoakcouncil.org/license/1.0.0
	npx license-checker-rseidelsohn --summary --onlyAllow '$(allowed_licenses)' --excludePackages 'jackspeak@3.4.3;path-scurry@1.11.1;package-json-from-dist@1.0.1;pvagls@0.0.1'
scan/source:
	$(fortify_install_path)/bin/sourceanalyzer -b InfraTypeScript $(shell pwd)/src/edge/**/*.ts --exclude node_modules --verbose
	$(fortify_install_path)/bin/sourceanalyzer -b InfraTypeScript $(shell pwd)/src/frontend/**/*.ts --exclude node_modules --verbose
	$(fortify_install_path)/bin/sourceanalyzer -b InfraTypeScript $(shell pwd)/src/infra.aws/**/*.ts --exclude node_modules --verbose
scan/cloudformation-templates:
	make -f makefile.aws cdk_action=synth cdk_nag=true stage="$(stage)" deploy/cicd/main
	make -f makefile.aws cdk_action=synth cdk_nag=true stage="$(stage)" aws_cli_profile_arg="--profile ${aws_$(stage)_cli_profile}" app_files_uploaded=false deploy/backend
	make -f makefile.aws cdk_action=synth cdk_nag=true stage="$(stage)" aws_cli_profile_arg="--profile ${aws_$(stage)_cli_profile}" deploy/frontend-waf
	make -f makefile.aws cdk_action=synth cdk_nag=true stage="$(stage)" aws_cli_profile_arg="--profile ${aws_$(stage)_cli_profile}" app_files_uploaded=false deploy/frontend

generate-license-report:
	npx license-report --output=csv --fields=name --fields=licenseType --delimiter=" - " 

# If we shared this as a zip file, what would we need to remove?
superclean:
	make -f makefile.aws clean/infra
	make clean/frontend
	make clean/edge
	
	npx shx rm -rf ./node_modules