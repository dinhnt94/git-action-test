#!/bin/bash

# Documentation 
read -r -d '' USAGE_TEXT << EOM
Usage: github.sh command [<param>...]
Run given command in github.

Requires github environment variables (additional may be required for specific commands):
    GITHUB_REPOSITORY
    GITHUB_TOKEN
    
Available commands:  
    build <project_name>    start build of given project
                            outputs build request id
                            requires: GITHUB_REF                        
    help                    display this usage text                             
EOM

set -e

GITHUB_URL="https://api.github.com/repos/${GITHUB_REPOSITORY}"

# Functions

##
# Print message on stderr to do not affect stdout which can be used as input to another commands.
#
# Input:
#    MESSAGE - message to print
#
function log {
    MESSAGE=$1
    >&2 echo "$MESSAGE"
}

##
# Print error message and exit program with status code 1
#
# Input:
#   MESSAGE - error message to show
##
function fail {
    MESSAGE=$1
    log "ERROR: $MESSAGE"
    log "$USAGE_TEXT"
    exit 1
}

##
# Fast fail when given environment variable is not set.
#
# Input:
#   ENV_VAR - name of environment variable to check
##
function require_env_var {
    local ENV_VAR=$1
    if [[ -z "${ENV_VAR}" ]]; then
        fail "$ENV_VAR is not set"
    fi  
}

##
# Fast fail when given parameter is empty
#
# Input:
#   MESSAGE - message to show when requirement is not met
#   PARAM - parameter which should be not null
##
function require_not_null {
    local MESSAGE=$1
    if [[ -z "$2" ]]; then
        fail "$MESSAGE"
    fi
}

##
# Make HTTP POST call to github
#
# Input:
#   URL - part of URL after github repo base url
#   DATA - form data to post (optional)
##
function post {
    local URL=$1
    local DATA=$2
    if [[ ! -z $DATA ]]; then
        DATA="-H 'Content-Type: application/json' -d '$DATA'"
    fi
    eval "curl -XPOST -s -g -H 'Accept: application/vnd.github.v3+json' -H 'Authorization: token ${GITHUB_TOKEN}' ${DATA} ${GITHUB_URL}/${URL}"
}

##
# Make HTTP GET call to github
#
# Input:
#   URL - part of URL after github base url
##
function get {
    local URL=$1
    curl -s -g -H "Accept: application/vnd.github.v3+json" -H "Authorization: token ${GITHUB_TOKEN}" ${GITHUB_URL}/${URL}
}

##
# Get current branch name
#
# Input:
#   REQUIRED - any not empty value to perform validation on existence of environment variable with branch name
##
function get_branch {
    if [[ -n "$1" ]]; then
        require_env_var GITHUB_REF
    fi
    echo ${GITHUB_REF##*/}
}

##
# Trigger build in github
#
# Build in github is triggered by dispatching custom event with job parameter set to project name.
# TODO: apply waiting tracking id build
#
# Input:
#   PROJECT_NAME - name of project to start build for
#   NAMESPACE - name of space: bsc-test, bsc-prod ....
#
# Output:
#   build number
##
function trigger_build {
    local NAMESPACE=$1
    local PROJECT_NAME=$2
    require_not_null "Project name not speficied" ${PROJECT_NAME} 
    BRANCH=$(get_branch required)
    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    BODY="$(cat <<-EOM
    {
        "event_type": "build-${NAMESPACE}-${PROJECT_NAME}",
        "client_payload": {
            "job": "${PROJECT_NAME}",
            "namespace": "${NAMESPACE}"
        }
    }
EOM
    )"
    echo $BODY
    post dispatches "${BODY}"
}

##
# Main
##

# Validatate common requirements
require_env_var GITHUB_REPOSITORY
require_env_var GITHUB_TOKEN

# Parse command
case $1 in
    build)        
        trigger_build $2 $3
        ;;
    help)
        log "$USAGE_TEXT"
        ;;
    *)
        fail "Unknown command $1"
        ;;        
esac