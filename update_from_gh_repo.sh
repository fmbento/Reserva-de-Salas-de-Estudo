#!/bin/bash
git pull
# Coloca este script de atualização do container docker a partir do repositorio como executável
chmod +x ./update_from_gh_repo.sh
sudo docker-compose build
sudo docker-compose down
sudo docker-compose up -d

