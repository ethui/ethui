#!/bin/bash
# A helper script to define ANSI code and provide 'echo' and 'printf' functions to printf/echo ansi strings

# Usage:
#     source bash_ansi_color.sh
#     printf_ansi "This is BOLD AND RED\n" $ANSI_TEXT_BOLD_RED
#     echo_ansi "Echo applies newlines!" $ANSI_TEXT_UNDERLINE_PURPLE $ANSI_BACKGROUND_YELLOW

# Derrived from AHaymond's README on ANSI color codes
# https://gist.github.com/AHaymond/e96f00ed0ba64a9af419296bf852c5bb


# Regular Colors
export ANSI_TEXT_BLACK="\e[0;30m"
export ANSI_TEXT_RED="\e[0;31m"
export ANSI_TEXT_GREEN="\e[0;32m"
export ANSI_TEXT_YELLOW="\e[0;33m"
export ANSI_TEXT_BLUE="\e[0;34m"
export ANSI_TEXT_PURPLE="\e[0;35m"
export ANSI_TEXT_CYAN="\e[0;36m"
export ANSI_TEXT_WHITE="\e[0;37m"
export ANSI_TEXT_GREY="\e[0;39m"

# Bold
export ANSI_TEXT_BOLD_BLACK="\e[1;30m"
export ANSI_TEXT_BOLD_RED="\e[1;31m"
export ANSI_TEXT_BOLD_GREEN="\e[1;32m"
export ANSI_TEXT_BOLD_YELLOW="\e[1;33m"
export ANSI_TEXT_BOLD_BLUE="\e[1;34m"
export ANSI_TEXT_BOLD_PURPLE="\e[1;35m"
export ANSI_TEXT_BOLD_CYAN="\e[1;36m"
export ANSI_TEXT_BOLD_WHITE="\e[1;37m"
export ANSI_TEXT_BOLD_GREY="\e[1;39m"

# Underline
export ANSI_TEXT_UNDERLINE_BLACK="\e[4;30m"
export ANSI_TEXT_UNDERLINE_RED="\e[4;31m"
export ANSI_TEXT_UNDERLINE_GREEN="\e[4;32m"
export ANSI_TEXT_UNDERLINE_YELLOW="\e[4;33m"
export ANSI_TEXT_UNDERLINE_BLUE="\e[4;34m"
export ANSI_TEXT_UNDERLINE_PURPLE="\e[4;35m"
export ANSI_TEXT_UNDERLINE_CYAN="\e[4;36m"
export ANSI_TEXT_UNDERLINE_WHITE="\e[4;37m"
export ANSI_TEXT_UNDERLINE_GREY="\e[4;39m"

# Background
export ANSI_BACKGROUND_BLACK="\e[40m"
export ANSI_BACKGROUND_RED="\e[41m"
export ANSI_BACKGROUND_GREEN="\e[42m"
export ANSI_BACKGROUND_YELLOW="\e[43m"
export ANSI_BACKGROUND_BLUE="\e[44m"
export ANSI_BACKGROUND_PURPLE="\e[45m"
export ANSI_BACKGROUND_CYAN="\e[46m"
export ANSI_BACKGROUND_WHITE="\e[47m"

# High Intensty
export ANSI_HIGH_INTENSITY_BLACK="\e[0;90m"
export ANSI_HIGH_INTENSITY_RED="\e[0;91m"
export ANSI_HIGH_INTENSITY_GREEN="\e[0;92m"
export ANSI_HIGH_INTENSITY_YELLOW="\e[0;93m"
export ANSI_HIGH_INTENSITY_BLUE="\e[0;94m"
export ANSI_HIGH_INTENSITY_PURPLE="\e[0;95m"
export ANSI_HIGH_INTENSITY_CYAN="\e[0;96m"
export ANSI_HIGH_INTENSITY_WHITE="\e[0;97m"

# Bold High Intensty
export ANSI_BOLD_HIGH_INTENSITY_BLACK="\e[1;90m"
export ANSI_BOLD_HIGH_INTENSITY_RED="\e[1;91m"
export ANSI_BOLD_HIGH_INTENSITY_GREEN="\e[1;92m"
export ANSI_BOLD_HIGH_INTENSITY_YELLOW="\e[1;93m"
export ANSI_BOLD_HIGH_INTENSITY_BLUE="\e[1;94m"
export ANSI_BOLD_HIGH_INTENSITY_PURPLE="\e[1;95m"
export ANSI_BOLD_HIGH_INTENSITY_CYAN="\e[1;96m"
export ANSI_BOLD_HIGH_INTENSITY_WHITE="\e[1;97m"

# High Intensty backgrounds
export ANSI_HIGH_INTENSITY_BACKGROUND_BLACK="\e[0;100m"
export ANSI_HIGH_INTENSITY_BACKGROUND_RED="\e[0;101m"
export ANSI_HIGH_INTENSITY_BACKGROUND_GREEN="\e[0;102m"
export ANSI_HIGH_INTENSITY_BACKGROUND_YELLOW="\e[0;103m"
export ANSI_HIGH_INTENSITY_BACKGROUND_BLUE="\e[0;104m"
export ANSI_HIGH_INTENSITY_BACKGROUND_PURPLE="\e[0;105m"
export ANSI_HIGH_INTENSITY_BACKGROUND_CYAN="\e[0;106m"
export ANSI_HIGH_INTENSITY_BACKGROUND_WHITE="\e[0;107m"

# Reset
export ANSI_RESET_RESET="\e[0m"

function printf_ansi(){
    ansi_codes="${@:2}"
    ansi_codes="${ansi_codes//[[:blank:]]/}"
    printf "$ansi_codes$1$ANSI_RESET_RESET"
}

function echo_ansi(){
    ansi_codes="${@:2}"
    ansi_codes="${ansi_codes//[[:blank:]]/}"
    printf "$ansi_codes$1$ANSI_RESET_RESET\n"
}
