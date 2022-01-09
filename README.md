# KokoMines
Multiplayer Minesweeper

Deployed to https://ancient-fortress-80937.herokuapp.com/

## Hosting a LAN server
1. You will need git, npm, and node. If these aren't already installed on your system:
    - Install git: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
    - Install nvm: https://github.com/nvm-sh/nvm#installing-and-updating
    - Now install the current LTS version of `npm` and `node` by doing `nvm install --lts`
2. Download this repo: `git clone https://github.com/babelthuap/kokomines.git`
3. Install the dependencies: `cd kokomines && npm install`
4. Start the server: `npm start`
5. You should see a log like `listening on your.ip.address:5000`. In your browser, go to `http://your.ip.address:5000`.
    - Anyone on your LAN should also be able to access `http://your.ip.address:5000`. Have fun!
    - If port `5000` doesn't work for some reason, specify a different port when starting the server, e.g. `npm start 8000`
    - If you have other connection issues, check your firewall settings and proxy settings.
