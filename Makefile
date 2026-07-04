SHELL := /bin/bash

NVM_INIT = export NVM_DIR="$$HOME/.nvm"; if [ -s "$$NVM_DIR/nvm.sh" ]; then . "$$NVM_DIR/nvm.sh"; fi

.PHONY: usage upgrade start test lint deploy

usage:
	@cat .usage

.DEFAULT:
	@cat .usage

upgrade:
	@$(NVM_INIT); pnpm up -Lri

start:
	@$(NVM_INIT); pnpm start

test:
	@$(NVM_INIT); pnpm test

lint:
	@$(NVM_INIT); pnpm lint

deploy:
	@$(NVM_INIT); pnpm deploy
