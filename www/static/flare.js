function Flare(scale, textures) {
  var intensity = (1.0 + scale) * (0.8 + 0.2 * Math.random());
  var frequency = 20 * Math.random() + 30;
  var duration = 0.5 + 0.5 * Math.random();
  var baseColor = new THREE.Color(
      1.0,
      0.6 + 0.2 * Math.random(),
      0.6 + 0.2 * Math.random());
  var scaledColor = function(scale) {
    return baseColor.clone().multiplyScalar(scale);
  };

  var blending = THREE.AdditiveBlending;
  var obj = new THREE.LensFlare(textures[0], 40, 0, blending, scaledColor(1.3));
  obj.add(textures[2], 45, 0.0, blending, scaledColor(0.30));
  obj.add(textures[1], 40, 0.4, blending, scaledColor(0.06));
  obj.add(textures[2], 80, 0.45, blending, scaledColor(0.12));
  obj.add(textures[1], 100, 0.8, blending, scaledColor(0.03));
  obj.add(textures[2], 140, 1.0, blending, scaledColor(0.06));
  this.obj = obj;

  for (var i = 0; i < obj.lensFlares.length; i++) {
    obj.lensFlares[i].opacity = 0;
    obj.lensFlares[i].scale = intensity;
  }

  this.animate = function(delta, elapsed) {
    this.start = this.start || elapsed;
    if (elapsed > this.start + duration + 1.0) {
      obj.visible = false;
      return;
    }

    var opacity = smoothstep(this.start, this.start + 0.5, elapsed)
        * (1 - smoothstep(this.start + 0.5 + duration, this.start + 1.0 + duration, elapsed))
        * (1 + 0.1 * Math.sin(elapsed * frequency));
    for (var i = 0; i < obj.lensFlares.length; i++) {
      obj.lensFlares[i].opacity = opacity;
    }
  };
}

