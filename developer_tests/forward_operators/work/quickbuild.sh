#!/usr/bin/env bash

main() {


[ -z "$DART" ] && echo "ERROR: Must set DART environment variable" && exit 9
source "$DART"/build_templates/buildfunctions.sh

MODEL="template"
LOCATION="threed_sphere"
dev_test=1
TEST="forward_operators"

programs=( \
rttov_test
rttov_unit_tests
)


# quickbuild arguments
arguments "$@"

# clean the directory
\rm -f -- *.o *.mod Makefile .cppdefs

# build and run preprocess before making any other DART executables
buildpreprocess

# build 
buildit

# clean up
\rm -f -- *.o *.mod

}

main "$@"
