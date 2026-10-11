SHELL := /bin/bash

NVM_INIT = export NVM_DIR="$$HOME/.nvm"; if [ -s "$$NVM_DIR/nvm.sh" ]; then . "$$NVM_DIR/nvm.sh"; fi

.PHONY: usage upgrade start test lint deploy audit

usage:
	@cat .usage

.DEFAULT:
	@cat .usage

upgrade:
	@$(NVM_INIT); yarn upgrade-interactive

start:
	@$(NVM_INIT); yarn start

test:
	@$(NVM_INIT); yarn test

lint:
	@$(NVM_INIT); yarn lint

deploy:
	@$(NVM_INIT); yarn deploy

audit:
	@$(NVM_INIT); yarn audit
