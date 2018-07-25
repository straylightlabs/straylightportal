'use strict';

function Logo(task, sound) {
  this.sound = sound;

  this.scene = new THREE.Scene();

  this.camera = new THREE.PerspectiveCamera(45, 1, 1, 10000);
  this.camera.position.y = 10;
  this.camera.lookAt(new THREE.Vector3(0, 0, 0));

  this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
  });
  this.renderer.setClearColor(0x000000, 0);
  this.renderer.setPixelRatio(getDPR());

  this.loadAssets(task);
  this.addMeshes();
  this.initComposer();
};

Logo.prototype.loadAssets = function(task) {
  var textureLoader = new THREE.TextureLoader();
  this.logoTexture = textureLoader.load('/images/logo.png', task.add());
  this.logoBlurredTexture = textureLoader.load('/images/logo-blurred.png', task.add());
};

Logo.prototype.addMeshes = function() {
  var logoMaterial = new THREE.SpriteMaterial({
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    map: this.logoTexture,
  });
  this.logoSprite = new THREE.Sprite(logoMaterial);
  
  var logoBlurMaterial = new THREE.SpriteMaterial({
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    map: this.logoBlurredTexture,
    transparent: true,
    opacity: 0.0,
  });
  this.logoBlurSprite = new THREE.Sprite(logoBlurMaterial);

  this.logoSprite.add(this.logoBlurSprite);
  this.logoSprite.scale.set(20, 20, 1);
  this.scene.add(this.logoSprite);
};

Logo.prototype.initComposer = function() {
  this.composer = new THREE.EffectComposer(this.renderer);

  var renderPass = new THREE.RenderPass(this.scene, this.camera);
  this.composer.addPass(renderPass);

  var afterEffectPass = new THREE.ShaderPass(afterEffectShader);
  afterEffectPass.renderToScreen = true;
  this.composer.addPass(afterEffectPass);

  this.afterEffectUniforms = afterEffectPass.uniforms;
  this.afterEffectUniforms.uTime.value = 1e10;
  this.afterEffectUniforms.uIntensity.value = 0.5;
  this.afterEffectUniforms.uEnableMarble.value = 0;
  this.afterEffectUniforms.uEnableFade.value = 0;
  this.afterEffectUniforms.uEnableNoise.value = 0;
};

Logo.prototype.animate = function(delta, elapsed) {
  this.afterEffectUniforms.uGlobalTime.value = elapsed;

  var y = pnoise(elapsed * 2);
  var s = 0.5 + 0.5 * pnoise(elapsed * 20);
  this.logoBlurSprite.material.opacity = y * s;
  if (this.sound) {
    this.sound.updateStatic(this.logoBlurSprite.material.opacity);
  }

  if (this.enabled && this.timeToStartNoise === undefined) {
    this.timeToStartNoise = elapsed + FADE_DURATION;
  }
  if (this.timeToStartNoise !== undefined
      && elapsed >= this.timeToStartNoise) {
    this.afterEffectUniforms.uEnableNoise.value = 1;
  }
};

Logo.prototype.render = function(delta, elapsed) {
  if (this.enabled) {
    this.composer.render(delta);
  }
};

Logo.prototype.resize = function(size) {
  var height = 200;
  var width = 500;
  if (size && size.width && size.width < width) {
    width = size.width;
  }

  this.afterEffectUniforms.uResolution.value =
      new THREE.Vector2(width, height);

  this.camera.aspect = width / height;
  this.camera.updateProjectionMatrix();

  this.renderer.setSize(width, height);
  this.composer.reset();

  $('#logo').width(width);

  var scale = width / 500;
  this.logoSprite.scale.set(20 * scale, 20 * scale, 1);
};

