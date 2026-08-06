SHELL := /bin/sh
.PHONY: up down build reset logs ps pull

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose up -d --build

reset:
	docker compose down -v
	docker compose up -d --build

logs:
	docker compose logs -f

ps:
	docker compose ps
