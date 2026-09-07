#!/usr/bin/env bash
# Exit on error
set -o errexit

if [ -d "Cogniva-Backend" ]; then
  echo "==> Moving into Cogniva-Backend directory"
  cd Cogniva-Backend
fi

echo "==> Installing dependencies"
pip install -r requirements.txt

echo "==> Collecting static files"
python manage.py collectstatic --no-input

echo "==> Applying database migrations"
python manage.py migrate
