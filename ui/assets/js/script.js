// const Matter = require('matter-js');

function mulberry32(a) {
	return function() {
		let t = a += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
}

const rand = mulberry32(Date.now());

const {
	Engine, Render, Runner, Composites, Common, MouseConstraint, Mouse,
	Composite, Bodies, Events,
} = Matter;

const wallPad = 64;
const loseHeight = 84;
const statusBarHeight = 64;
const previewBallHeight = 96;
const friction = {
	friction: 0.006,
	frictionStatic: 0.006,
	frictionAir: 0,
	restitution: 0.5
};

const GameStates = {
	MENU: 0,
	READY: 1,
	DROP: 2,
	LOSE: 3,
};

const BigPreviewElement = document.querySelector("#big-game-next-fruit")

const Game = {
	width: window.innerWidth,
	height: window.innerHeight,
	sparks: [],
	elements: {
		canvas: document.getElementById('game-canvas'),
		ui: document.getElementById('game-ui'),
		score: document.getElementById('game-score'),
		end: document.getElementById('game-end-container'),
		endTitle: document.getElementById('game-end-title'),
		statusValue: document.getElementById('game-highscore-value'),
		nextFruitImg: document.getElementById('game-next-fruit'),
		previewBall: null,
	},
	cache: { highscore: 0 },
	sounds: {
		button: new Audio('./assets/snd/button.ogg'),
		clear: new Audio('./assets/snd/clear.ogg'),

		boom0: new Audio('./assets/snd/boom/boom0.ogg'),
		boom1: new Audio('./assets/snd/boom/boom1.ogg'),
		boom2: new Audio('./assets/snd/boom/boom2.ogg'),
		boom3: new Audio('./assets/snd/boom/boom3.ogg'),
		boom4: new Audio('./assets/snd/boom/boom4.ogg'),
		boom5: new Audio('./assets/snd/boom/boom5.ogg'),
		boom6: new Audio('./assets/snd/boom/boom6.ogg'),
		boom7: new Audio('./assets/snd/boom/boom7.ogg'),
		boom8: new Audio('./assets/snd/boom/boom8.ogg'),
		
		lapupu0: new Audio('./assets/snd/lapupu/lapupu0.ogg'),
		lapupu1: new Audio('./assets/snd/lapupu/lapupu1.ogg'),
		lapupu2: new Audio('./assets/snd/lapupu/lapupu2.ogg'),
		lapupu3: new Audio('./assets/snd/lapupu/lapupu3.ogg'),
		lapupu4: new Audio('./assets/snd/lapupu/lapupu4.ogg'),
		lapupu5: new Audio('./assets/snd/lapupu/lapupu5.ogg'),
		lapupu6: new Audio('./assets/snd/lapupu/lapupu6.ogg'),
		lapupu7: new Audio('./assets/snd/lapupu/lapupu7.ogg'),
		lapupu8: new Audio('./assets/snd/lapupu/lapupu8.ogg'),
		lapupu9: new Audio('./assets/snd/lapupu/lapupu9.ogg'),
		lapupu10: new Audio('./assets/snd/lapupu/lapupu10.ogg'),
		lapupu11: new Audio('./assets/snd/lapupu/lapupu11.ogg'),

		fall1: new Audio('./assets/snd/fall/fall1.ogg'),
		fall2: new Audio('./assets/snd/fall/fall2.ogg'),
		fall3: new Audio('./assets/snd/fall/fall3.ogg'),
		fall4: new Audio('./assets/snd/fall/fall4.ogg'),
	},
	spawnSpark(x, y, color) {
    Game.sparks.push({
			x: x, y: y,
			vx: (Math.random() - 0.5) * 3,
			vy: (Math.random() - 0.5) * 3,
			life: 1.0,
      decay: 0.02 + Math.random() * 0.02, // Durée de vie entre 25 et 50 frames
			color: color || '219, 87, 0',
    });
	},

	stateIndex: GameStates.MENU,

	score: 0,
	fruitsMerged: [],
	calculateScore: function () {
		const score = Game.fruitsMerged.reduce((total, count, sizeIndex) => {
			const value = Game.fruitSizes[sizeIndex].scoreValue * count;
			return total + value;
		}, 0);

		Game.score = score;
		Game.elements.score.innerText = Game.score;
	},

	fruitSizes: [
		{ radius: 12,  scoreValue: 1,    img: './assets/img/lapupu/0.png'  },
    { radius: 18,  scoreValue: 3,    img: './assets/img/lapupu/1.png'  },
    { radius: 26,  scoreValue: 6,    img: './assets/img/lapupu/2.png'  },
    { radius: 36,  scoreValue: 10,   img: './assets/img/lapupu/3.png'  },
    { radius: 48,  scoreValue: 15,   img: './assets/img/lapupu/4.png'  },
    { radius: 60,  scoreValue: 21,   img: './assets/img/lapupu/5.png'  },
    { radius: 72,  scoreValue: 28,   img: './assets/img/lapupu/6.png'  },
    { radius: 86,  scoreValue: 36,   img: './assets/img/lapupu/7.png'  },
    { radius: 100, scoreValue: 45,   img: './assets/img/lapupu/8.png'  },
    { radius: 115, scoreValue: 55,   img: './assets/img/lapupu/9.png'  },
    { radius: 130, scoreValue: 70,   img: './assets/img/lapupu/10.png' },
    { radius: 145, scoreValue: 90,   img: './assets/img/lapupu/11.png' },
    { radius: 160, scoreValue: 120,  img: './assets/img/lapupu/12.png' },
    { radius: 175, scoreValue: 160,  img: './assets/img/lapupu/13.png' },
    { radius: 190, scoreValue: 210,  img: './assets/img/lapupu/14.png' },
    { radius: 205, scoreValue: 280,  img: './assets/img/lapupu/15.png' },
    { radius: 220, scoreValue: 380,  img: './assets/img/lapupu/16.png' },
    { radius: 235, scoreValue: 500,  img: './assets/img/lapupu/17.png' },
    { radius: 250, scoreValue: 1000, img: './assets/img/lapupu/18.png' },
	],
	currentFruitSize: 0,
	nextFruitSize: 0,
	setNextFruitSize: function () {
		Game.nextFruitSize = Math.floor(rand() * 5);
		Game.elements.nextFruitImg.src = `./assets/img/lapupu/${Game.nextFruitSize}.png`;
	},

	showHighscore: function () {
		Game.elements.statusValue.innerText = Game.cache.highscore;
	},
	loadHighscore: function () {
		const gameCache = localStorage.getItem('labuboom-game-cache');
		if (gameCache === null) {
			Game.saveHighscore();
			return;
		}

		Game.cache = JSON.parse(gameCache);
		Game.showHighscore();
	},
	saveHighscore: function () {
		Game.calculateScore();
		if (Game.score < Game.cache.highscore) return;

		Game.cache.highscore = Game.score;
		Game.showHighscore();
		Game.elements.endTitle.innerText = 'New Highscore!';

		localStorage.setItem('labuboom-game-cache', JSON.stringify(Game.cache));
	},

	initGame: function () {
		Render.run(render);
		Runner.run(runner, engine);


		for (let [key,sound] of Object.entries(Game.sounds)) {
			if (key.startsWith("boom")) {
				sound.volume = 0.5;
			} else
			if (key.startsWith("lapupu")) {
				sound.volume = 0.5;
			} else
			sound.volume = 0.1;
		}

		Composite.add(engine.world, menuStatics);

		Game.loadHighscore();
		Game.elements.ui.style.display = 'none';
		Game.fruitsMerged = Array.apply(null, Array(Game.fruitSizes.length)).map(() => 0);

		const menuMouseDown = function () {
			if (mouseConstraint.body === null || mouseConstraint.body?.label !== 'btn-start') {
				return;
			}

			Events.off(mouseConstraint, 'mousedown', menuMouseDown);
			Game.startGame();
		}

		Events.on(mouseConstraint, 'mousedown', menuMouseDown);

		Events.on(render, 'afterRender', () => {
    const ctx = render.context;
    const bodies = Composite.allBodies(engine.world);

    bodies.forEach(body => {
			if (body.sizeIndex !== undefined && !body.isStatic) {
				const size = Game.fruitSizes[body.sizeIndex];
				const r = size.radius;
				
				const angleOffset = 0.3;
				const currentAngle = body.angle + angleOffset;
				const offsetX = Math.sin(currentAngle) * r;
				const offsetY = -Math.cos(currentAngle) * r;
				const tipX = body.position.x + offsetX;
				const tipY = body.position.y + offsetY;
				if (Math.random() > 0.8) {
					Game.spawnSpark(tipX, tipY, body.sparkColor);
				}
			}
    });
		
    // RENDU DES ÉTINCELLES
    ctx.save(); // Sécurité pour le canvas
    for (const i in Game.sparks) {
      const s = Game.sparks[i];   
			
			s.x += s.vx;
			s.y += s.vy;
			s.life -= s.decay;

			if (s.life <= 0) {
				Game.sparks.splice(i, 1);
				continue;
			}

			ctx.beginPath();
			const radius = 2.5 * s.life;
			ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
			
			ctx.fillStyle = `rgba(${s.color}, ${s.life})`;
			
			ctx.shadowBlur = 6 * s.life;
			ctx.shadowColor = `rgba(${s.color}, 0.8)`;
			
			ctx.fill();
    }
    ctx.restore(); 
});
	},

	startGame: async function () {
		Game.sounds[`lapupu${Math.floor(Math.random() * 11)}`].play();
		Game.sounds.button.play();

		Composite.remove(engine.world, menuStatics);
		Composite.add(engine.world, gameStatics);

		Game.calculateScore();
		Game.elements.endTitle.innerText = 'Game Over!';
		Game.elements.ui.style.display = 'block';
		Game.elements.end.style.display = 'none';
		Game.elements.previewBall = await Game.generateFruitBody(Game.width / 2, previewBallHeight, 0, { isStatic: true });
		Composite.add(engine.world, Game.elements.previewBall);

		setTimeout(() => {
			Game.stateIndex = GameStates.READY;
		}, 250);

		Events.on(mouseConstraint, 'mouseup', function (e) {
			Game.addFruit(e.mouse.position.x);
		});

		Events.on(mouseConstraint, 'mousemove', function (e) {
			if (Game.stateIndex !== GameStates.READY) return;
			if (Game.elements.previewBall === null) return;

			if (document.body.clientHeight - e.mouse.position.y > 50) {
				BigPreviewElement.classList.remove("show");
			} else {
				BigPreviewElement.classList.add("show");
			}
			
			Game.elements.previewBall.position.x = e.mouse.position.x;
		});

		Events.on(engine, 'collisionStart', async function (e) {
			for (let i = 0; i < e.pairs.length; i++) {
				const { bodyA, bodyB } = e.pairs[i];

				// Skip if collision is wall
				if (bodyA.isStatic || bodyB.isStatic) continue;

				const aY = bodyA.position.y + bodyA.circleRadius;
				const bY = bodyB.position.y + bodyB.circleRadius;

				// Uh oh, too high!
				if (aY < loseHeight || bY < loseHeight) {
					Game.loseGame();
					return;
				}

				// Skip different sizes
				if (bodyA.sizeIndex !== bodyB.sizeIndex) continue;

				// Skip if already popped
				if (bodyA.popped || bodyB.popped) continue;

				let newSize = bodyA.sizeIndex + 1;

				// Go back to smallest size
				if (bodyA.circleRadius >= Game.fruitSizes[Game.fruitSizes.length - 1].radius) {
					newSize = 0;
				}

				Game.fruitsMerged[bodyA.sizeIndex] += 1;

				// Therefore, circles are same size, so merge them.
				const midPosX = (bodyA.position.x + bodyB.position.x) / 2;
				const midPosY = (bodyA.position.y + bodyB.position.y) / 2;

				bodyA.popped = true;
				bodyB.popped = true;

				const avgVelocity = {
					x: (bodyA.velocity.x + bodyB.velocity.x) / 2,
					y: (bodyA.velocity.y + bodyB.velocity.y) / 2
				};
				const avgAngularVelocity = (bodyA.angularVelocity + bodyB.angularVelocity) / 2;

				let newFruit = await Game.generateFruitBody(midPosX, midPosY, newSize);

				Matter.Body.setVelocity(newFruit, {
					x: avgVelocity.x * 0.8,
					y: (avgVelocity.y * 0.8) - (0.05 * newFruit.mass)
				});

				Matter.Body.setAngularVelocity(newFruit, avgAngularVelocity);



				Game.sounds[`boom${Math.floor(Math.random() * 9)}`].play();
				Game.sounds.clear.play();
				
				Composite.remove(engine.world, [bodyA, bodyB]);
				Composite.add(engine.world, newFruit);
				Game.addPop(midPosX, midPosY, bodyA.circleRadius);
				Game.calculateScore();
			}
		});
	},

	addPop: function (x, y, r) {
		const circle = Bodies.circle(x, y, r, {
			isStatic: true,
			collisionFilter: { mask: 0x0040 },
			angle: rand() * (Math.PI * 2),
			render: {
				sprite: {
					texture: './assets/img/pop.png',
					xScale: r / 384,
					yScale: r / 384,
				}
			},
		});

		Composite.add(engine.world, circle);
		
		const fade = () => {
			circle.render.opacity = Math.max(0, circle.render.opacity - 0.035);
    };

    Events.on(engine, 'afterUpdate', fade);

    setTimeout(() => {
      Events.off(engine, 'afterUpdate', fade); // Très important : stopper l'écouteur
      Composite.remove(engine.world, circle);
    }, 500);
	},

	loseGame: function () {
		Game.stateIndex = GameStates.LOSE;
		Game.elements.end.style.display = 'flex';
		runner.enabled = false;
		Game.saveHighscore();
	},

	// Returns an index, or null
	lookupFruitIndex: function (radius) {
		const sizeIndex = Game.fruitSizes.findIndex(size => size.radius == radius);
		if (sizeIndex === undefined) return null;
		if (sizeIndex === Game.fruitSizes.length - 1) return null;

		return sizeIndex;
	},

	generateFruitBody: async function (x, y, sizeIndex, extraConfig = {}) {
		const size = Game.fruitSizes[sizeIndex];

		let img = new Image();
		img.src = size.img;

		await new Promise(rs => img.onload = rs);

		let s = Math.max(img.width, img.height);
		let cnvs = document.createElement("canvas");
		let ctx = cnvs.getContext('2d');
		cnvs.width = s; cnvs.height = s;

		let oX = (s - img.width) / 2;
		let oY = (s - img.height) / 2;

		ctx.drawImage(img, oX, oY);

		const circle = Bodies.circle(x, y, size.radius * 0.9, {
			...friction,
			...extraConfig,
			render: { sprite: { texture: cnvs.toDataURL(), xScale: size.radius / (s/2), yScale: size.radius / (s/2) } },
		});
		circle.sizeIndex = sizeIndex;
		circle.popped = false;

		return circle;
	},

	addFruit: async function (x) {
		if (Game.stateIndex !== GameStates.READY) return;

		
		Game.sounds[`lapupu${Math.floor(Math.random() * 4)}`].play();
		Game.sounds.button.play();

		Game.stateIndex = GameStates.DROP;
		const latestFruit = await Game.generateFruitBody(x, previewBallHeight, Game.currentFruitSize);
		Composite.add(engine.world, latestFruit);

		Game.currentFruitSize = Game.nextFruitSize;
		Game.setNextFruitSize();
		Game.calculateScore();

		Composite.remove(engine.world, Game.elements.previewBall);
		Game.elements.previewBall = await Game.generateFruitBody(render.mouse.position.x, previewBallHeight, Game.currentFruitSize, {
			isStatic: true,
			collisionFilter: { mask: 0x0040 }
		});

		setTimeout(() => {
			if (Game.stateIndex === GameStates.DROP) {
				Composite.add(engine.world, Game.elements.previewBall);
				Game.stateIndex = GameStates.READY;
			}
		}, 500);
	}
}

const engine = Engine.create();
const runner = Runner.create();
const render = Render.create({
	element: Game.elements.canvas,
	engine,
	options: {
		width: Game.width,
		height: Game.height,
		wireframes: false,
		background: '#ffdcae'
	}
});

const menuStatics = [
	(() => {
    const w = Game.width / 2;
    const h = Game.width / 2;
    const textureWidth = 256;
    
    return Bodies.rectangle(Game.width / 2, Game.height * 0.4, w, h, {
      isStatic: true,
      render: { 
        sprite: { 
          texture: './assets/img/bg-menu.png',
          xScale: w / textureWidth, 
          yScale: h / textureWidth 
        } 
      },
    });
  })(),

	// Add each fruit in a circle
	...Array.apply(null, Array(Game.fruitSizes.length)).map((_, index) => {
		const x = (Game.width / 2) + (Game.width / 2.5) * Math.cos((Math.PI * 2 * index)/Game.fruitSizes.length);
		const y = (Game.height * 0.4) + (Game.width / 2.5) * Math.sin((Math.PI * 2 * index)/Game.fruitSizes.length);
		const r = Game.width / 2;

		return Bodies.circle(x, y, r, {
			isStatic: true,
			render: {
				sprite: {
					texture: `./assets/img/lapupu/${index}.png`,
					xScale: r / 1024,
					yScale: r / 1024,
				},
			},
		});
	}),

	(() => {
    const w = Game.width / 2;
    const h = Game.width / 2;
    const textureWidth = 256;

		return Bodies.rectangle(Game.width / 2, Game.height * 0.75, w, h, {
			isStatic: true,
			label: 'btn-start',
			render: {
				sprite: {
					texture: './assets/img/btn-start.png',
					xScale: w / textureWidth,
					yScale: h / textureWidth
				}
			},
		});
	})(),
];

const wallProps = {
	isStatic: true,
	render: { fillStyle: '#FFEEDB' },
	...friction,
};

const gameStatics = [
	// Left
	Bodies.rectangle(-(wallPad / 2), Game.height / 2, wallPad, Game.height, wallProps),

	// Right
	Bodies.rectangle(Game.width + (wallPad / 2), Game.height / 2, wallPad, Game.height, wallProps),

	// Bottom
	Bodies.rectangle(Game.width / 2, Game.height + (wallPad / 2) - statusBarHeight, Game.width, wallPad, wallProps),
];

// add mouse control
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
	mouse: mouse,
	constraint: {
		stiffness: 0.2,
		render: {
			visible: false,
		},
	},
});
render.mouse = mouse;

Game.initGame();

const resizeCanvas = () => {
	const screenWidth = document.body.clientWidth;
	const screenHeight = document.body.clientHeight;

	let newWidth = Game.width;
	let newHeight = Game.height;
	let scaleUI = 1;

	if (screenWidth * 1.5 > screenHeight) {
		newHeight = Math.min(Game.height, screenHeight);
		newWidth = newHeight / 1.5;
		scaleUI = newHeight / Game.height;
	} else {
		newWidth = Math.min(Game.width, screenWidth);
		newHeight = newWidth * 1.5;
		scaleUI = newWidth / Game.width;
	}

	// render.canvas.style.width = `${newWidth}px`;
	// render.canvas.style.height = `${newHeight}px`;

	Game.elements.ui.style.width = `${Game.width}px`;
	Game.elements.ui.style.height = `${Game.height}px`;
	Game.elements.ui.style.transform = `scale(${scaleUI})`;
};

document.body.onload = resizeCanvas;
document.body.onresize = resizeCanvas;
