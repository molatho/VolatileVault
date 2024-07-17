#!/bin/bash

dd if=/dev/urandom of=test1m.bin count=1 bs=1M status=progress
dd if=/dev/urandom of=test10m.bin count=10 bs=1M status=progress
dd if=/dev/urandom of=test100m.bin count=100 bs=1M status=progress
