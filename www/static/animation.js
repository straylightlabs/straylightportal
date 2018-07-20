'use strict';

function Animation(task, sound, backgroundMode) {
  this.resizeFuncs = [];
  this.animateFuncs = [];
  this.interactive = false;
  this.shouldAddRipples = false;
  this.tonedDown = false;
  this.animationClock = undefined;
  this.rippleQueue = CENTER_QUEUE.clone();
  this.rippleCoord = new THREE.Vector2(0, 0);
  this.raycaster = new THREE.Raycaster();
  this.mousePoints = new Queue(100, null);
  this.clock = new THREE.Clock();
  this.sound = sound;
  this.backgroundMode = backgroundMode;

  this.scene = new THREE.Scene();
  this.glowScene = new THREE.Scene();

  this.camera = new THREE.PerspectiveCamera(45, 1, 1, 10000);
  this.camera.position.y = 10;
  this.camera.lookAt(new THREE.Vector3(0, 0, 0));

  this.renderer = new THREE.WebGLRenderer({ antialias: true });
  this.renderer.setClearColor(0x000000, 0);
  this.renderer.autoClear = false;
  this.renderer.setPixelRatio(getDPR());

  this.loadAssets(task);
  this.addMeshes();
  this.addLighting();
  this.initComposer();

  setInterval(function() {
    if (this.shouldAddRipples) {
      this.addRipple(this.rippleCoord);
    }
  }.bind(this), 50);
};

Animation.prototype.loadAssets = function(task) {
  var textureLoader = new THREE.TextureLoader();
  this.glowTexture = textureLoader.load('/images/flare.png', task.add());
  this.flareTexture1 = textureLoader.load('/images/flare1.png', task.add());
  this.flareTexture2 = textureLoader.load('/images/flare2.gif', task.add());
  this.flareTexture3 = textureLoader.load('/images/flare3.jpg', task.add());
};

Animation.prototype.addMeshes = function() {
  this.surfaceMesh = new THREE.Mesh(
      buildSurfaceGeometry(),
      this.createSurfaceMaterial());
  this.scene.add(this.surfaceMesh);

  this.backgroundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshPhongMaterial({
          color: surfaceShader.uniforms.uBaseColor.value,
          depthWrite: false,
          transparent: true,
      }));
  this.backgroundMesh.rotation.x = -Math.PI / 2;
  this.backgroundMesh.position.y = -0.01;
  this.scene.add(this.backgroundMesh);

  this.pointGlow = this.createPointGlow(this.surfaceMesh.geometry);
  this.glowScene.add(this.pointGlow);

  this.lineGlow = this.createLineGlow(this.surfaceMesh.geometry);
  this.glowScene.add(this.lineGlow);
};

Animation.prototype.addLighting = function() {
  var ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  this.scene.add(ambientLight);

  var dirLight1 = new THREE.DirectionalLight(0xffffff, 0.3);
  dirLight1.position.set(20, 5, 20);
  this.scene.add(dirLight1);
  var dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
  dirLight2.position.set(0, 5, 20);
  this.scene.add(dirLight2);
  var dirLight3 = new THREE.DirectionalLight(0xffffff, 0.3);
  dirLight3.position.set(20, 5, 0);
  this.scene.add(dirLight3);

  this.animateFuncs.push(function(delta, elapsed) {
    dirLight1.position.x = 20 * Math.sin(elapsed / 2);
    dirLight1.position.z = 20 * Math.cos(elapsed / 2);
  }.bind(this));
};

Animation.prototype.initComposer = function() {
  var glowComposer = this.initGlowComposer();
  var mainComposer = this.initMainComposer();

  this.composer = {
    render: function(delta) {
      if (mainComposer.glowPass) {
        glowComposer.render(delta);
        mainComposer.glowPass.uniforms.tBlend.value =
            glowComposer.readBuffer.texture;
      }
      mainComposer.render(delta);
    },

    reset: function() {
      glowComposer.reset();
      mainComposer.reset();
    },
  };
};

Animation.prototype.initGlowComposer = function() {
  var glowComposer = new THREE.EffectComposer(this.renderer);

  var renderPass = new THREE.RenderPass(this.glowScene, this.camera);
  glowComposer.addPass(renderPass);

  var noiseCancel = new THREE.ShaderPass(noiseCancelShader);
  this.resizeFuncs.push(function(size) {
    noiseCancel.uniforms.uResolution.value =
        new THREE.Vector2(size.width, size.height);
  });
  glowComposer.addPass(noiseCancel);

  var blur = new THREE.ShaderPass(blurShader);
  this.resizeFuncs.push(function(size) {
    blur.uniforms.uResolution.value =
        new THREE.Vector2(size.width, size.height);
  });
  glowComposer.addPass(blur);

  return glowComposer;
};

Animation.prototype.initMainComposer = function() {
  var mainComposer = new THREE.EffectComposer(this.renderer);

  var renderPass = new THREE.RenderPass(this.scene, this.camera);
  mainComposer.addPass(renderPass);

  var glowPass = new THREE.ShaderPass(additiveBlendShader);
  mainComposer.addPass(glowPass);
  mainComposer.glowPass = glowPass;

  this.bloomPass = new THREE.BloomPass(0.0);
  this.bloomPass.enabled = false;
  mainComposer.addPass(this.bloomPass);

  var afterEffectPass = new THREE.ShaderPass(afterEffectShader);
  afterEffectPass.renderToScreen = true;
  this.initCommonUniforms(afterEffectPass.uniforms);
  mainComposer.addPass(afterEffectPass);

  return mainComposer;
};

Animation.prototype.initCommonUniforms = function(uniforms) {
  this.animateFuncs.push(function(delta, elapsed) {
    uniforms.uGlobalTime.value = elapsed;
    uniforms.uTime.value = this.animationClock || 0.;
    uniforms.uIntensity.value = this.tonedDown ? 0.6 : 1.0;
  }.bind(this));
  this.resizeFuncs.push(function(size) {
    uniforms.uResolution.value = new THREE.Vector2(size.width, size.height);
  });
};

Animation.prototype.pickFlareLocation = function() {
  this.raycaster.setFromCamera(this.rippleCoord, this.camera);
  var intersections = this.raycaster.intersectObject(this.backgroundMesh);
  if (intersections.length > 0) {
    var near = intersections[0].point;
    var points = this.surfaceMesh.geometry.vertices;
    for (var i = 0; i < points.length; i++) {
      if (points[i].distanceTo(near) < 0.5) {
        return points[i];
      }
    }
  }
};

Animation.prototype.maybeAddFlare = function(delta, elapsed) {
  var start = FADE_OUT_TIME * 0.5;
  var end = FADE_OUT_TIME;
  if (this.animationClock < start || this.animationClock >= end) {
    return;
  }

  // Throttling.
  if (this.timeToAddFlare !== undefined && elapsed < this.timeToAddFlare) {
    return;
  }
  var scale = smoothstep(start, end, this.animationClock);
  var delay = 2.5 - 2 * scale + 0.2 * Math.random();
  this.timeToAddFlare = elapsed + delay;

  var point = this.pickFlareLocation();
  if (!point) {
    return;
  }

  var textures = [this.flareTexture1, this.flareTexture2, this.flareTexture3];
  var flare = new Flare(scale, textures);
  flare.obj.position.copy(point);
  this.scene.add(flare.obj);
  this.animateFuncs.push(flare.animate.bind(flare));
};

Animation.prototype.createSurfaceMaterial = function() {
  var material = new THREE.ShaderMaterial(surfaceShader);

  material.lights = true;
  material.color = new THREE.Color(0xffffff);
  material.vertexColors = true;

  material.uniforms.diffuse.value = material.color;
  material.uniforms.uCenters.value = this.rippleQueue.elements;
  this.initCommonUniforms(material.uniforms);

  return material;
};

Animation.prototype.createLineGlow = function(geometry) {
  var lineGeom = new THREE.EdgesGeometry(geometry, 0.1);
  // TODO: Consider adding this back.
  // removeOverlappingLines(lineGeom);
  var lineGlow = new THREE.LineSegments(
      lineGeom, new THREE.ShaderMaterial(lineGlowShader));

  var uniforms = lineGlow.material.uniforms;
  this.initCommonUniforms(uniforms);
  uniforms.uCenters.value = this.rippleQueue.elements;
  return lineGlow;
};

Animation.prototype.createPointGlow = function(geometry) {
  var pointGlow = new THREE.Points(
      geometry, new THREE.ShaderMaterial(pointGlowShader));

  var uniforms = pointGlow.material.uniforms;
  this.initCommonUniforms(uniforms);
  uniforms.tDiffuse.value = this.glowTexture;
  uniforms.uCenters.value = this.rippleQueue.elements;

  return pointGlow;
};

Animation.prototype.addRipple = function(coord) {
  this.raycaster.setFromCamera(coord, this.camera);
  var intersections = this.raycaster.intersectObject(this.backgroundMesh);
  if (intersections.length > 0) {
    var point = intersections[0].point;
    var ripple = new THREE.Vector4(point.x, 0.0, point.z, this.animationClock);
    this.rippleQueue.add(ripple);
  }
};

Animation.prototype.updateRippleCoord = function(delta, elapsed) {
  if (this.nextRippleTurn === undefined || elapsed >= this.nextRippleTurn) {
    this.rippleDestination = new THREE.Vector2(
        2 * Math.random() - 1,
        2 * Math.random() - 1)
        .multiplyScalar(0.6);
    this.nextRippleTurn = elapsed + 2.0 + 1.0 * Math.random();
  }
  this.rippleVelocity = this.rippleVelocity || new THREE.Vector2(1, 1);
  this.rippleVelocity.add(
      this.rippleDestination.clone().sub(
          this.rippleCoord).multiplyScalar(delta));
  var MAX_SPEED = 0.5;
  if (this.rippleVelocity.length() > MAX_SPEED) {
    this.rippleVelocity.multiplyScalar(
        MAX_SPEED / this.rippleVelocity.length());
  }
  this.rippleCoord.add(this.rippleVelocity.clone().multiplyScalar(delta));
};

Animation.prototype.updateBloomFilter = function(delta, elapsed) {
  var intensity = smoothstep(FADE_OUT_TIME, FADE_OUT_TIME + FADE_DURATION, this.animationClock)
      * (1 - smoothstep(FADE_IN_TIME, FADE_IN_TIME + FADE_DURATION, this.animationClock));
  this.bloomPass.enabled = intensity > 0.01;
  this.bloomPass.copyUniforms.opacity.value = 10 * intensity;
};

Animation.prototype.animate = function(delta, elapsed) {
  for (var i = 0; i < this.animateFuncs.length; i++) {
    this.animateFuncs[i](delta, elapsed);
  }

  this.rippleQueue.forEach(function(ripple) {
    ripple.y += delta;
  });

  this.updateRippleCoord(delta, elapsed);

  if (this.animationClock === undefined) {
    return;
  }
  this.animationClock += delta;

  this.maybeAddFlare(delta, elapsed);
  this.updateBloomFilter(delta, elapsed);

  if (this.animationClock < FADE_OUT_TIME) {
    this.updateSound();
  } else {
    this.interactive = false;
  }
  if (!this.tonedDown &&
      this.animationClock > FADE_OUT_TIME + FADE_DURATION) {
    this.rippleQueue.clear();
    this.shouldAddRipples = false;
    this.tonedDown = true;
    if (this.sound) {
      this.sound.stopForeground();
      this.sound.stopBackground1();
      this.sound.playStatic();
    }

    cga('event', 'Animation', 'Complete');

    window.location.hash = '#1';
  }
  if (!this.shouldAddRipples &&
      this.animationClock > FADE_IN_TIME + FADE_DURATION + 5) {
    this.shouldAddRipples = true;
    if (this.sound) {
      this.sound.playBackground2();
    }
  }
};

Animation.prototype.skip = function() {
  this.tonedDown = true;
  this.interactive = false;
  this.shouldAddRipples = true;
  if (this.sound) {
    this.sound.playStatic();
    this.sound.stopBackground1();
    this.sound.playBackground2();
  }

  cga('event', 'Animation', 'Skip');

  window.location.hash = '#1';
};

Animation.HINT1 = 'headphones recommended';
Animation.HINT2 = 'click and drag';
Animation.HINT3 = 'click and hold';

Animation.prototype.scheduleHints = function() {
  var hint = $('#hint');
  if (isFacebookApp()) {
    hint.css('top', '25px');
  } else {
    hint.css('bottom', '25px');
  }
  hint.html(Animation.HINT1).addClass('visible');
  this.hint1Timer = setTimeout(function() {
    if (hint.html() == Animation.HINT1) {
      hint.removeClass('visible');
    }
  }, 4 * 1000);
  this.hint2Timer = setTimeout(function() {
    hint.html(Animation.HINT2).addClass('visible');
  }, 8 * 1000);
  this.hint3Timer = setTimeout(function() {
    hint.html(Animation.HINT3).addClass('visible');
  }, 25 * 1000);
};

Animation.prototype.render = function(delta, elapsed) {
  if (!this.initDone) {
    if (this.backgroundMode) {
      this.tonedDown = true;
      this.shouldAddRipples = true;
      if (this.sound) {
        this.sound.playBackground2();
      }
    } else {
      this.interactive = true;
      this.scheduleHints();
      if (this.sound) {
        this.sound.playBackground1();
      }
    }
    this.initDone = true;
  }

  this.composer.render(delta);
};

Animation.prototype.resize = function(size) {
  for (var i = 0; i < this.resizeFuncs.length; i++) {
    this.resizeFuncs[i](size);
  }

  this.camera.aspect = size.aspectRatio;
  this.camera.updateProjectionMatrix();

  this.renderer.setSize(size.width, size.height);
  this.composer.reset();
};

Animation.prototype.onMouseDown = function(coord, event) {
  if (!this.interactive) {
    return;
  }

  this.lastMouseDownTime = new Date().getTime();

  cga('event', 'Animation', 'Start');

  this.rippleCoord = coord;
  this.addRipple(this.rippleCoord);
  if (this.sound) {
    this.sound.playForeground();
  }

  if (this.animationClock === undefined) {
    this.animationClock = 0.0;
    this.shouldAddRipples = true;
  }
};

Animation.prototype.onMouseUp = function() {
  if (!this.interactive) {
    return;
  }

  if (this.hint2Timer) {
    var dragDuration = (new Date().getTime() - this.lastMouseDownTime) / 1000.0;
    if (dragDuration > 1.0) {
      clearTimeout(this.hint2Timer);
      this.hint2Timer = null;

      var hint = $('#hint');
      if (hint.html() == Animation.HINT2) {
        hint.removeClass('visible');
      }
    }
  }

  // For realtime analysis.
  cga('event', 'Animation',
      'Duration_' + Math.floor(this.animationClock) + 's');
  // For more granular analysis.
  cga('timing', 'Animation', 'Duration',
      Math.round(this.animationClock * 1000));

  this.animationClock = undefined;
  this.shouldAddRipples = false;
  if (this.sound) {
    this.sound.stopForeground();
  }
};

Animation.prototype.updateSound = function() {
  if (!this.sound || !this.interactive) {
    return;
  }
  var masterIntensity = this.animationClock / FADE_OUT_TIME;
  var x = Math.min(1, Math.max(-1, this.rippleCoord.x));
  var y = Math.min(1, Math.max(-1, this.rippleCoord.y));
  this.sound.update(masterIntensity, 0.5 + 0.5 * y, x);
};

Animation.prototype.onMouseMove = function(coord) {
  if (!this.interactive) {
    return;
  }

  this.rippleCoord = coord;

  return true;
};

Animation.prototype.reset = function() {
  this.initDone = false;
  this.animationClock = undefined;
  this.shouldAddRipples = false;
  this.interactive = true;
  this.tonedDown = false;
  this.rippleQueue.clear();
  this.sound.stopStatic();
  this.sound.stopBackground2();
  this.sound.playBackground1();
};

