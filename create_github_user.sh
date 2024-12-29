#!/bin/bash

# Exit on any error
set -e

# Variables
USERNAME="github"

# Check if the user already exists
if id "$USERNAME" &>/dev/null; then
    echo "User '$USERNAME' already exists. Exiting..."
    exit 1
fi

# Prompt for the password
read -s -p "Enter a password for the new user '$USERNAME': " PASSWORD
echo
read -s -p "Confirm the password: " PASSWORD_CONFIRM
echo

# Check if passwords match
if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
    echo "Passwords do not match. Exiting..."
    exit 1
fi

# Create the user
echo "Creating user '$USERNAME'..."
sudo adduser --gecos "" $USERNAME --disabled-password
echo "$USERNAME:$PASSWORD" | sudo chpasswd

# Add the user to the sudo group
echo "Adding user '$USERNAME' to the sudo group..."
sudo usermod -aG sudo $USERNAME

# Install Docker if not already installed
if ! command -v docker &>/dev/null; then
    echo "Docker not found. Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y docker.io
    sudo systemctl enable docker
    sudo systemctl start docker
fi

# Add the user to the Docker group
echo "Adding user '$USERNAME' to the Docker group..."
sudo usermod -aG docker $USERNAME

# Inform the user of successful completion
echo "User '$USERNAME' created successfully, added to the sudo and docker groups."
echo "You may need to log out and log back in for the Docker group changes to take effect."
