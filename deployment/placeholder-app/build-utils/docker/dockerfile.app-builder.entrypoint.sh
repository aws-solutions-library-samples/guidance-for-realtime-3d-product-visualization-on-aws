#!/bin/bash
set -ex

echo "source $HOME/.cargo/env" >> $HOME/.bashrc

cd /opt/app

make package