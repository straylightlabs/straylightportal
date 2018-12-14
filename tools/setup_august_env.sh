#!/bin/bash

conda create --name august -y
conda activate august
pip install --upgrade pip
pip install python-dateutil py-august
