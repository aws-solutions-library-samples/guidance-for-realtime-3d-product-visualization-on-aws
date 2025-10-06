# @license
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# This file is responsible for defining developer commands.

# Repolinter is ran locally as part of the sample release process.
repolinter_rules_path := /Users/$(shell whoami)/Downloads/amazon-ospo-ruleset.json

# Fortify is ran locally as part of the sample release process.
fortify_install_path := /Applications/Fortify/Fortify_SCA_and_Apps_22.1.1
fortify_license_path := /Users/$(shell whoami)/Downloads/fortify.license

# Allowed licenses in cargo ecosystem.
allowed_licenses := --allow MIT --allow Apache-2.0 --allow BSD-2-Clause --allow BSD-3-Clause --allow BSD* --allow 0BSD --allow ISC --allow Python-2.0 --allow CC-BY-4.0 --allow CC-BY-3.0 --allow CC0-1.0 --allow Unlicense --allow WTFPL

setup:
	cargo build
	rustup target add x86_64-unknown-linux-gnu

run:
	cargo run

# See: https://takashiidobe.com/gen/building-rust-binaries-for-different-platforms.html
package:
	cargo build --release --target x86_64-unknown-linux-gnu -v
	chmod a+x target/x86_64-unknown-linux-gnu/release/app
	cp -R ./assets target/x86_64-unknown-linux-gnu/release/

publish-sample:
	node --version || exit 1

# Need main branch. See: https://github.com/todogroup/repolinter/issues/299
	rm -rf /tmp/repolinter; mkdir /tmp/repolinter
	cd /tmp/repolinter; npm init --force --yes; npm install git+https://github.com/todogroup/repolinter.git

# FIXME Not sure how to get binaries installed to cargo bin path otherwise.
	rm -rf /tmp/rust-license
	git clone https://github.com/najeal/rust-license /tmp/rust-license
	cd /tmp/rust-license; cargo build; cargo install --path .

	rm -rf /tmp/cargo-licenses
	git clone https://github.com/jhenrique04/cargo-licenses /tmp/cargo-licenses
	cd /tmp/cargo-licenses; cargo build; cargo install --path .

	make add-license-header-to-files
	make scan

add-license-header-to-files:
	rust-license license-header --config ./config/rust-license.yaml --apply src/*.rs

scan:
	make lint/repo
	make scan/licenses
	make scan/source
	make generate-license-report

lint/repo:
	NODE_OPTIONS=max-old-space-size=127284016 node /tmp/repolinter/node_modules/repolinter/bin/repolinter.js lint --dryRun -r $(repolinter_rules_path) \
		--allowPaths $(shell pwd)/src \
		.
scan/licenses:
	cargo-licenses check $(allowed_licenses)
scan/source:
	$(fortify_install_path)/bin/sourceanalyzer -b AppSrc $(shell pwd)/src/**/*.rs --exclude target --verbose
generate-license-report:
	cargo-licenses generate --format json; cat .license_report.json

# If we shared this as a zip file, what would we need to remove?
superclean:	
	rm -rf ./target
	rm -f ./app.log
	rm -f ./.license_report.json