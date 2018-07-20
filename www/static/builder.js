// A helper class that builds BufferGeometry based on a series of addTriangle
// calls. It combines duplicate vertices and tries to save position attribute
// buffer etc.
function BufferGeometryBuilder(duplicateVertices) {
  this.indices = [];
  this.vertices = [];
  this.vertexObjects = [];
  this.uv = [];
  this._uniqueVertexTuples = [];

  this.getVertexIndex = function(v) {
    if (!duplicateVertices) {
      var index = this._uniqueVertexTuples.indexOf(v);
      if (index >= 0) {
        return index;
      }
    }
    this.vertices.push(v[0]);
    this.vertices.push(v[1]);
    this.vertices.push(v[2]);
    this.vertexObjects.push(new THREE.Vector3(v[0], v[1], v[2]));
    this.uv.push(v[0]);
    this.uv.push(v[2]);
    this._uniqueVertexTuples.push(v);
    return this._uniqueVertexTuples.length - 1;
  };

  this.addTriangle = function(v1, v2, v3) {
    this.indices.push(this.getVertexIndex(v1));
    this.indices.push(this.getVertexIndex(v2));
    this.indices.push(this.getVertexIndex(v3));
  };

  this.build = function() {
    var geom = new THREE.BufferGeometry();
    var maxIndex = this._uniqueVertexTuples.length - 1;
    var indices = new (maxIndex > 65535 ? Uint32Array : Uint16Array)(this.indices);
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    geom.addAttribute('position', new THREE.BufferAttribute(new Float32Array(this.vertices), 3));
    geom.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(this.uv), 2));
    geom.computeFaceNormals();
    geom.vertices = this.vertexObjects;

    return geom;
  };
}

function removeOverlappingLines(geom) {
  var lines = [];
  var newPositions = [];
  var positions = geom.attributes.position.array;
  for (var i = 0; i < positions.length; i += 6) {
    var p1 = new THREE.Vector3(positions[i+0], positions[i+1], positions[i+2]);
    var p2 = new THREE.Vector3(positions[i+3], positions[i+4], positions[i+5]);

    var enclosed = false;
    for (var j = 0; j < lines.length; j++) {
      var o = lines[j];
      if (Math.abs(o.p1.distanceTo(p1) + p1.distanceTo(o.p2) - o.d) < 0.001 &&
          Math.abs(o.p1.distanceTo(p2) + p2.distanceTo(o.p2) - o.d) < 0.001) {
        enclosed = true;
        break;
      }
    }
    if (!enclosed) {
      var d = p1.distanceTo(p2);
      if (d > 0.6) {
        lines.push({ p1: p1, p2: p2, d: d });
      }
      newPositions.push(p1.x);
      newPositions.push(p1.y);
      newPositions.push(p1.z);
      newPositions.push(p2.x);
      newPositions.push(p2.y);
      newPositions.push(p2.z);
    }
  }
  geom.addAttribute('position', new THREE.BufferAttribute(new Float32Array(newPositions), 3));
}

function buildSurfaceGeometry() {
  var geomBuilder = new BufferGeometryBuilder(isIOS());

  function shrinkZ(v1, v2, v3) {
    var shrink = 0.2 + Math.random() * 0.3;
    if (v1[2] == v2[2]) {
      v1[0] += (v3[0] - v1[0]) * shrink;
      v1[2] += (v3[2] - v1[2]) * shrink;
      v2[0] += (v3[0] - v2[0]) * shrink;
      v2[2] += (v3[2] - v2[2]) * shrink;
    } else if (v2[2] == v3[2]) {
      v2[0] += (v1[0] - v2[0]) * shrink;
      v2[2] += (v1[2] - v2[2]) * shrink;
      v3[0] += (v1[0] - v3[0]) * shrink;
      v3[2] += (v1[2] - v3[2]) * shrink;
    } else if (v3[2] == v1[2]) {
      v3[0] += (v2[0] - v3[0]) * shrink;
      v3[2] += (v2[2] - v3[2]) * shrink;
      v1[0] += (v2[0] - v1[0]) * shrink;
      v1[2] += (v2[2] - v1[2]) * shrink;
    }
  }

  function buildTetrahedron(v1, v2, v3, height) {
    v1 = v1.slice();
    v2 = v2.slice();
    v3 = v3.slice();

    if (Math.random() < 0.3) {
      shrinkZ(v1, v2, v3);
    }

    var c = [
        (v1[0] + v2[0] + v3[0]) / 3,
        (v1[1] + v2[1] + v3[1]) / 3 + height,
        (v1[2] + v2[2] + v3[2]) / 3
    ];

    // Avoid gaps between polygons with iOS.
    // TODO: confirm if this is still necessary with the background mesh.
    if (isIOS()) {
      var expand = function(to, from) {
        to[0] += (to[0] - from[0]) * 0.01;
      }
      expand(v1, c);
      expand(v2, c);
      expand(v3, c);
    }

    geomBuilder.addTriangle(c, v1, v2);
    geomBuilder.addTriangle(c, v2, v3);
    geomBuilder.addTriangle(c, v3, v1);
  }

  // Recursively builds a tetrahedron fractal.
  function breakOrBuildTetrahedron(v1, v2, v3, height, index) {
    var shouldRecurse = index == 1 ? 0.75 : index == 2 ? 0.35 : 0;
    if (Math.random() <= shouldRecurse) {
      // Breaks the current trianle into 4 smaller triangles and tries to
      // build tetrahedron for each triangle.
      var v12 = [(v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2, (v1[2] + v2[2]) / 2];
      var v23 = [(v2[0] + v3[0]) / 2, (v2[1] + v3[1]) / 2, (v2[2] + v3[2]) / 2];
      var v31 = [(v3[0] + v1[0]) / 2, (v3[1] + v1[1]) / 2, (v3[2] + v1[2]) / 2];
      breakOrBuildTetrahedron(v1, v12, v31, height / 2, index + 1);
      breakOrBuildTetrahedron(v12, v2, v23, height / 2, index + 1);
      breakOrBuildTetrahedron(v31, v23, v3, height / 2, index + 1);
      breakOrBuildTetrahedron(v12, v23, v31, height / 2, index + 1);
    } else {
      var shouldBuild = index == 3 ? 0.80 : index == 2 ? 0.95 : 1.0;
      if (Math.random() <= shouldBuild) {
        // Build a tetrahedron.
        buildTetrahedron(v1, v2, v3, height);
      }
    }
  }

  var AMOUNT_X = Math.floor(window.innerWidth / 50);
  var AMOUNT_Z = Math.floor(window.innerHeight / 50);
  var EDGE = 1.8;
  var HEIGHT = 0.6;

  for (var x = 0; x < AMOUNT_X; x++) {
    for (var z = 0; z < AMOUNT_Z; z++) {
      var vs = [
          [0,           0, 0],
          [-0.5 * EDGE, 0, EDGE],
          [0.5 * EDGE,  0, EDGE],
          [EDGE,        0, 0],
      ];
      // Offset the vertices so the object is centered in the scene.
      for (var i = 0; i < vs.length; i++) {
        vs[i][0] += x * EDGE - AMOUNT_X / 2;
        vs[i][2] += z * EDGE - AMOUNT_Z / 2;
      }
      breakOrBuildTetrahedron(vs[0], vs[1], vs[2], HEIGHT, 1);
      breakOrBuildTetrahedron(vs[0], vs[2], vs[3], HEIGHT, 1);
    }
  }

  return geomBuilder.build();
}

