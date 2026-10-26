# Open-source references

The Stage 2 run-and-gun systems and level-design patterns were researched from these MIT-licensed projects. The implementation and all pixel art in this project are original and programmatically drawn; no original Contra ROM graphics, audio, or proprietary assets are bundled.

- `kirogi97/contra-clone` — weapon switching, side-scrolling combat, enemy projectiles, and boss-flow reference. https://github.com/kirogi97/contra-clone
- `DanMat/Blastix` — data-oriented platform layout, checkpoints, spread weapon, aimed fire, and boss-gated progression reference. https://github.com/DanMat/Blastix

Their MIT license texts and copyright notices remain available in the linked repositories.

## Stage 3 (Adventure Island)

The Stage 3 mechanics were researched from the original Hudson Soft *Adventure Island* (NES, 1986) design and from these open-source references. Again, all code and pixel art here are original and programmatically drawn — no ROM graphics, sprites, or audio are bundled.

- `martindib1/adventureisland` — Phaser 3 recreation of two NES stages; used as a mechanics cross-check (vitality meter, eggs, weapon behaviour). https://github.com/martindib1/adventureisland
- `dadecoza/benadv` — JavaScript port of the Atari 800 version of Adventure Island; reference for the fruit/skateboard loop. https://github.com/dadecoza/benadv
- StrategyWiki, *Adventure Island/Items* — item values and behaviour used to calibrate the vitality/fruit table and the two-hit egg rule. https://strategywiki.org/wiki/Adventure_Island/Items

Neither project was copied; both use external art assets and a game framework, whereas this project stays dependency-free with procedurally drawn sprites.