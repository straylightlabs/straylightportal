'use strict';

var commonUniforms = hereString(function() {/*
    uniform float uGlobalTime;
    uniform float uTime;
    uniform float uGlowStartTime;
    uniform float uNoiseStartTime;
    uniform float uFadeOutTime;
    uniform float uFadeInTime;
    uniform float uFadeDuration;
    uniform float uIntensity;
    uniform vec2 uResolution;
*/});

var commonUniformDict = {
    uGlobalTime:     { value: 0. },
    uTime:           { value: 0. },
    uGlowStartTime:  { value: FADE_OUT_TIME * 0.20 },
    uNoiseStartTime: { value: FADE_OUT_TIME * 0.50 },
    uFadeOutTime:    { value: FADE_OUT_TIME },
    uFadeInTime:     { value: FADE_IN_TIME },
    uFadeDuration:   { value: FADE_DURATION },
    uIntensity:      { value: 1. },
    uResolution:     { value: new THREE.Vector2(1., 1.) },
};

// Snippet of glsl functions that compute colors.
var colorFunction = hereString(function() {/*
    // Returns a color vector that oscillates in x, z axis.
    vec4 compute_color(float x, float y) {
        const float FREQUENCY = 20.0;
        return vec4(
            0.65 + 0.25 * sin(1.0 + x * FREQUENCY),  // r
            0.5,                                     // g
            0.75 + 0.25 * sin(y * FREQUENCY),        // b
            1.0);                                    // a
    }
*/});

var randomFunctions = hereString(function() {/*
    float rand(float t) {
        float wave = sin(t * 12.9898);
	return fract(wave * 43758.5453123);
    }
    float rand(vec2 v) {
        float wave = sin(dot(v, vec2(12.9898, 78.233)));
	return fract(wave * 43758.5453123);
    }
    float rand(vec2 v, float t) {
        float wave = sin(dot(v, vec2(12.9898, 78.233)));
	return fract(t * 0.5 + wave * 43758.5453123);
    }

    float pnoise(float t) {
        float i = floor(t);
        float f = fract(t);
        return smoothstep(0.5, 1.0, mix(rand(i), rand(i + 1.0), smoothstep(0., 1., f)));
    }

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    // From https://thebookofshaders.com/11/
    float snoise(vec2 v) {
	const vec4 C = vec4(0.211324865405187,   // (3.0 - sqrt(3.0)) / 6.0
			    0.366025403784439,   // 0.5 * (sqrt(3.0) - 1.0)
			    -0.577350269189626,  // -1.0 + 2.0 * C.x
			    0.024390243902439);  // 1.0 / 41.0
	vec2 i  = floor(v + dot(v, C.yy));
	vec2 x0 = v -   i + dot(i, C.xx);
	vec2 i1;
	i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
	vec4 x12 = x0.xyxy + C.xxzz;
	x12.xy -= i1;
	i = mod289(i);  // Avoid truncation effects in permutation
	vec3 p = permute(permute( i.y + vec3(0.0, i1.y, 1.0))
	    + i.x + vec3(0.0, i1.x, 1.0));

	vec3 m = max(0.5 - vec3(dot(x0, x0),
                     dot(x12.xy, x12.xy),
                     dot(x12.zw, x12.zw)),
                     0.0);
	m = m * m;
	m = m * m;
	vec3 x = 2.0 * fract(p * C.www) - 1.0;
	vec3 h = abs(x) - 0.5;
	vec3 ox = floor(x + 0.5);
	vec3 a0 = x - ox;
	m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
	vec3 g;
	g.x  = a0.x  * x0.x   + h.x  * x0.y;
	g.yz = a0.yz * x12.xz + h.yz * x12.yw;
	return 130.0 * dot(m, g);
    }
*/});

var NON_EXISTENT_POINT = new THREE.Vector4(0, -1, 0, 0);
var MAX_CENTERS = 100;
var CENTER_QUEUE = new Queue(MAX_CENTERS, NON_EXISTENT_POINT);

// A set of uniforms for shaders that use the height function below.
var uniformsWithHeightFunction = THREE.UniformsUtils.merge([
    commonUniformDict,
    {
        uCenters:          { value: CENTER_QUEUE.elements },
        uRadius:           { value: 1.0 },
        uPropagationSpeed: { value: 1.0 },
        uCancelingDelay:   { value: 1.0 },
    }]);

// Snippet of glsl functions that compute height.
var heightFunction = commonUniforms + hereString(function() {/*
    uniform vec4  uCenters[__MAX_CENTERS__];
    uniform float uRadius;
    uniform float uPropagationSpeed;
    uniform float uCancelingDelay;

    float variable_radius(vec2 v, vec2 center, float time) {
        const float MIN = 0.8;
        if (uTime >= uFadeInTime) {
          return MIN;
        }
        vec2 d = v - center;
        float angle = 0.5 + 0.5 * sin(atan(d.y, d.x) * 3.);
        float scale = smoothstep(0., uFadeOutTime, time)
            + 10. * smoothstep(uFadeOutTime * 0.7, uFadeOutTime, time);
        return MIN + uRadius * pow(angle, 1.5) * scale;
    }

    bool is_visible(vec2 v, vec2 center, float vradius) {
      float dc = distance(v, center);
      if (dc > vradius) {
          return false;
      }
      float a = pow((vradius - dc) / vradius, 0.2) * 99.0;
      float b = mod(v.x * 24247.0 + v.y * 58237.0, 99.0);
      return b < a;
    }

    // Computes the height of the ripple at the given vector.
    float compute_height(vec2 v, vec2 center, float radius_offset,
                         float time, float start) {
        float vradius = variable_radius(v, center, start);
        vradius += radius_offset;
        if (!is_visible(v, center, vradius)) {
            return 0.0;
        }

        // Constant animation speed after fade in.
        if (start >= uFadeInTime) {
          start = 0.0;
        }

        float distance = distance(v, center);
        float speed = uPropagationSpeed * (1.0 + start / uFadeOutTime * 4.0);
        float cut = vradius / speed + uCancelingDelay;
        if (start < uFadeOutTime && time > cut) {
            time = 2. * cut - time;
        }
        return max(0.0, min(1.0, time * speed - distance));
    }

    struct Ripple {
        float height;
        float time;
        float intensity;
    };

    Ripple compute_ripple(vec3 v, float radius_offset) {
        Ripple ripple;
        ripple.height = 0.0;
        ripple.time = 0.0;
        for (int i = 0; i < __MAX_CENTERS__; ++i) {
            float time = uCenters[i].y;
            float start = uCenters[i].w;
            if (time >= 0.0) {
                float height = compute_height(
                    v.xz, uCenters[i].xz, radius_offset, time, start);
                if (height > 0.0) {
                    ripple.height += height;
                    ripple.time = max(ripple.time, start);
                }
            }
        }
        ripple.height = max(0.0, min(1.0, ripple.height));
        ripple.intensity = ripple.height
            * (0.6 + 0.4 * smoothstep(uGlowStartTime, uFadeOutTime, ripple.time))
            * uIntensity;
        return ripple;
    }

*/}, {
    '__MAX_CENTERS__': MAX_CENTERS,
});

// Shader for a mesh surface to which we want to apply the height function.
var surfaceShader = {
    uniforms: THREE.UniformsUtils.merge([
        THREE.ShaderLib['phong'].uniforms,
        uniformsWithHeightFunction,
        {
            uBaseColor: { value: new THREE.Color(
                20.0 / 255.0,
                15.0 / 255.0,
                25.0 / 255.0) },
        }]),

    vertexShader: heightFunction + hereString(function() {/*
        uniform vec3 uBaseColor;

        varying vec3 vColor;
        varying vec3 vViewPosition;

        void main() {
            Ripple ripple = compute_ripple(position, 0.0);

            vec3 transformed = vec3(position);
            transformed.y *= ripple.height;

            vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            float intensity = pow(1.0 + transformed.y, 1.5 * uIntensity);
            vColor = uBaseColor * intensity;

            vViewPosition = - mvPosition.xyz;
        }
    */}),

    fragmentShader: THREE.ShaderChunk['meshphong_frag'],
    shading: THREE.FlatShading,
    depthWrite: false,
    transparent: true,
};

// Shader for point cloud which we want to glow based on the height function.
var pointGlowShader = {
    uniforms: THREE.UniformsUtils.merge([
        uniformsWithHeightFunction,
        {
            tDiffuse: { value: null },
        }]),

    vertexShader: randomFunctions + heightFunction + hereString(function() {/*
        varying float vIntensity;

        void main() {
          Ripple ripple = compute_ripple(position, -0.4);

          vec3 transformed = vec3(position);
          transformed.y *= ripple.height;

          vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          if (rand(position.xz) < 0.75) {
              gl_PointSize = 0.;
              return;
          }

          // Size of the point glow, scaled by the height map.
          vIntensity = ripple.intensity;
          if (vIntensity < 0.1) {
            vIntensity = 0.0;
          }
          gl_PointSize = vIntensity * 25.;
        }
    */}),

    fragmentShader: commonUniforms + colorFunction + hereString(function() {/*
        uniform sampler2D tDiffuse;

        varying float vIntensity;

        void main() {
            vec4 color = compute_color(
                gl_FragCoord.x / uResolution.x,
                gl_FragCoord.y / uResolution.y);
            float w = 0.5 * vIntensity;
            gl_FragColor = texture2D(tDiffuse, gl_PointCoord) * color * w;
        }
    */}),

    transparent: true,
    depthTest: false,
    blending: THREE.AdditiveBlending
};

// Shader for a wireframe which we want to glow based on the height function.
var lineGlowShader = {
    uniforms: uniformsWithHeightFunction,

    vertexShader: heightFunction + hereString(function() {/*
        varying float vIntensity;

        void main() {
            Ripple ripple = compute_ripple(position, 0.0);

            vec3 transformed = vec3(position);
            transformed.y *= ripple.height;

            vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
            gl_Position = projectionMatrix * mvPosition;

            vIntensity = ripple.intensity;
            // To simulate Open GL 3's "flat" qualifier.
            if (vIntensity < 0.1) {
                vIntensity = -1e10;
            }
        }
    */}),

    fragmentShader: commonUniforms + colorFunction + hereString(function() {/*
        varying float vIntensity;

        void main() {
            // To simulate Open GL 3's "flat" qualifier.
            if (vIntensity < 0.1) {
                discard;
            }
            vec4 color = compute_color(
                gl_FragCoord.x / uResolution.x,
                gl_FragCoord.y / uResolution.y);
            gl_FragColor = color * vIntensity * 1.2;
        }
    */}),

    transparent: true,
    depthTest: false,
    blending: THREE.AdditiveBlending
};

var simpleVertexShader = hereString(function() {/*
    varying vec2 vUv;

    void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
*/});

// Shader that adds application-specific after effects.
var afterEffectShader = {
    uniforms: THREE.UniformsUtils.merge([
        commonUniformDict,
        {
            tDiffuse:      { value: null },
            uEnableMarble: { value: 1 },
            uEnableFade:   { value: 1 },
            uEnableNoise:  { value: 1 },
        }]),

    vertexShader: simpleVertexShader,

    fragmentShader: commonUniforms + randomFunctions + hereString(function() {/*
        uniform sampler2D tDiffuse;
        uniform int uEnableMarble;
        uniform int uEnableFade;
        uniform int uEnableNoise;

        varying vec2 vUv;

        bool render_bottom_border() {
            float progress = uTime / uFadeOutTime;
            if (vUv.t < 5. / uResolution.y && vUv.s < progress) {
                gl_FragColor = vec4(1.0);
                return true;
            }
            return false;
        }

        vec4 compute_marble_noise() {
	    vec2 st = gl_FragCoord.xy / uResolution.xy;
            st.x *= uResolution.x / uResolution.y;
            vec2 pos = vec2(st);
	
            // Add a random position
	    vec2 vel = vec2(uGlobalTime * .06);
	    float df = snoise(pos + vel) * .25 + .25;

	    // Add another random position
	    float a = snoise(pos*vec2(cos(uGlobalTime*0.15),sin(uGlobalTime*0.1))*0.1)*3.1415;
	    vel = vec2(cos(a), sin(a));
	    df += snoise(pos + vel) * .25 + .25;

	    float v = smoothstep(.25, .75, fract(df));
            return vec4(vec3(.04, .02, .04) * v, 1.);
        }

        vec4 compute_tv_noise() {
            float speed = uGlobalTime * 5. * uIntensity;
            float x = 10. * pnoise(speed);
            float y = -6. * pnoise(speed + 0.5);
            float s = smoothstep(uNoiseStartTime, uFadeOutTime, uTime);

            vec2 m = vec2(x, y) * s * uIntensity / uResolution;
            vec4 n1 = texture2D(tDiffuse, vUv - m * 1.0);
            vec4 n2 = texture2D(tDiffuse, vUv - m * 0.5);
            vec4 n3 = texture2D(tDiffuse, vUv + m * 0.5);
            vec4 n4 = texture2D(tDiffuse, vUv + m * 1.0);
            return vec4(
                mix(n1.r, n2.r, 0.33),
                mix(n2.g, n3.g, 0.5),
                mix(n3.b, n4.b, 0.66),
                1.0);
        }

        vec4 compute_fade_color() {
            float rise = smoothstep(uFadeOutTime, uFadeOutTime + uFadeDuration, uTime);
            float drop = 1. - smoothstep(uFadeInTime, uFadeInTime + uFadeDuration, uTime);
            return vec4(rise * drop);
        }

        void main() {
            if (uTime < uFadeInTime && render_bottom_border()) {
                return;
            }

            gl_FragColor = texture2D(tDiffuse, vUv);
            float originalAlpha = gl_FragColor.a;
            if (uEnableNoise != 0) {
              gl_FragColor = gl_FragColor * 0.3 + compute_tv_noise() * 0.7;
            }
            if (uEnableMarble != 0) {
                gl_FragColor += compute_marble_noise();
            }
            if (uEnableFade != 0) {
                gl_FragColor += compute_fade_color();
            }
            gl_FragColor.a = originalAlpha;
        }
    */})
};

// Shader that additively blends tBlend to tDiffuse.
var additiveBlendShader = {
    uniforms: {
        tDiffuse: { value: null },
        tBlend:   { value: null },
    },

    vertexShader: simpleVertexShader,

    fragmentShader: hereString(function() {/*
        uniform sampler2D tDiffuse;
        uniform sampler2D tBlend;

        varying vec2 vUv;

        void main() {
            vec4 original = texture2D(tDiffuse, vUv);
            vec4 blend = texture2D(tBlend, vUv);
            gl_FragColor = original + blend;
        }
    */})
};

// Shader for removing single-pixel noises.
var noiseCancelShader = {
    uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1.0, 1.0) },
    },

    vertexShader: simpleVertexShader,

    fragmentShader: hereString(function() {/*
        uniform sampler2D tDiffuse;
        uniform vec2 uResolution;

        varying vec2 vUv;

        void main() {
            vec2 corners[8];
            corners[0] = vec2(-1.0, -1.0);
            corners[1] = vec2(0.0,  -1.0);
            corners[2] = vec2(1.0,  -1.0);
            corners[3] = vec2(-1.0, 0.0);
            corners[4] = vec2(1.0,  0.0);
            corners[5] = vec2(-1.0, 1.0);
            corners[6] = vec2(0.0,  1.0);
            corners[7] = vec2(1.0,  1.0);

            gl_FragColor = texture2D(tDiffuse, vUv);

            bool smooth = false;
            vec3 color_sum = vec3(0.0);
            for (int i = 0; i < 8; ++i) {
                vec4 c = texture2D(tDiffuse, vUv + corners[i] / uResolution);
                smooth = smooth || distance(gl_FragColor, c) < 0.5;
                color_sum += vec3(c);
            }

            if (!smooth) {
                gl_FragColor = vec4(color_sum / 8.0, 1.0);
            }
        }
    */}),
};

// Shader for applying gaussian blur.
// The blur radius is fixed for performance reason.
var blurShader = {
    uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1.0, 1.0) },
    },

    vertexShader: simpleVertexShader,

    fragmentShader: hereString(function() {/*
        uniform sampler2D tDiffuse;
        uniform vec2 uResolution;

        varying vec2 vUv;

        float get_opacity(int x, int y) {
            int distance = x * x + y * y;
            // (e^(-distance/2/s^2))/(PI*2*s^2) where s = 0.75
            return (
                distance == 0 ? 0.28294212105 :
                distance == 1 ? 0.11632098346 :
                distance == 2 ? 0.04782098594 :
                distance == 4 ? 0.00808238338 :
                distance == 5 ? 0.00332276714 :
                distance == 8 ? 0.00023087732 : -1.);
        }

        void main() {
            vec3 color = vec3(0.0);
            for (int x = -2; x <= 2; ++x) {
                for (int y = -2; y <= 2; ++y) {
                    vec4 c = texture2D(tDiffuse, vUv + vec2(x, y) / uResolution);
                    float opacity = get_opacity(x, y);
                    color += opacity * vec3(c);
                }
            }
            gl_FragColor = vec4(color, 1.0);
        }
    */}),
};

