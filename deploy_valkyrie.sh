#!/usr/bin/env bash

# don't forget to npm run dev
rsync -rv --exclude=.git --exclude=node_modules /Users/ryielle/Projects/rxdt_ryizome_cycle_gen_obs_plugin /Users/ryielle/Ryizome/.obsidian/plugins # rxdt sync for valkyrie
