
(function (scope) {

    let COLORS = ["#009e60", "#0051ba", "#ffd500", "#ff5800", "#c41e3a", "#ffffff"];
    let VIEW_ANGLE = 45;
    let NEAR = 0.1;
    let FAR = 10000;

    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;

    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(VIEW_ANGLE, windowWidth / windowHeight, NEAR, FAR);
    let renderer = new THREE.WebGLRenderer({antialias: true});

    function RubiksCube(dimension, textures) {
        const CUBE_SIZE = 4;

        const MATRIX_FIELD_LEN = 2;

        const TOTAL_SIZE = dimension * dimension * dimension;

        let colorPatterns = [];
        let matrix;

        let group3d = new THREE.Object3D();
        let meshes = [];

        let animTid;
        let moveHelper;

        let isFlatView = true;
        let meshesFlat = [];

        let groupFlat = new THREE.Object3D;
        let showFace = [1, 4, 0, 5, 2, 3];

        let pivotX = new THREE.Object3D();
        let pivotY = new THREE.Object3D();
        let pivotZ = new THREE.Object3D();

        group3d.add(pivotX);
        group3d.add(pivotY);
        group3d.add(pivotZ);

        // 初始化3d视图
        for (let x = 0; x < dimension; ++x) {
            for (let y = 0; y < dimension; ++y) {
                for (let z = 0; z < dimension; ++z) {
                    let cubeGeom = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
                    let colorPattern = 0;

                    // 只对魔方的外表面着色
                    if (x === 0) {
                        colorPattern |= 2;
                    } else if (x === dimension - 1) {
                        colorPattern |= 1;
                    }
                    if (y === 0) {
                        colorPattern |= 8;
                    } else if (y === dimension - 1) {
                        colorPattern |= 4;
                    }
                    if (z === 0) {
                        colorPattern |= 32;
                    } else if (z === dimension - 1) {
                        colorPattern |= 16;
                    }

                    let mesh = new THREE.Mesh(cubeGeom, []);
                    mesh.position.x = ((1 - dimension) / 2 + x) * CUBE_SIZE;
                    mesh.position.y = ((1 - dimension) / 2 + y) * CUBE_SIZE;
                    mesh.position.z = ((1 - dimension) / 2 + z) * CUBE_SIZE;

                    mesh.userData = meshes.length;

                    meshes.push(mesh);
                    colorPatterns.push(colorPattern);
                    group3d.add(mesh);
                }
            }
        }

        // 初始化flat视图
        for (let i = 0; i < 6; ++i) {
            for (let j = 0; j < dimension; ++j) {
                for (let k = 0; k < dimension; ++k) {
                    let cubeGeom = new THREE.PlaneGeometry(CUBE_SIZE, CUBE_SIZE);
                    let mat = new THREE.MeshBasicMaterial({map: textures[showFace[i]]});
                    let mesh = new THREE.Mesh(cubeGeom, mat);

                    if (i < 4) {
                        mesh.position.x = ((i - 2) * dimension + j) * CUBE_SIZE;
                        mesh.position.y = (k - 1) * CUBE_SIZE;
                    } else {
                        mesh.position.x = (-1 * dimension + j) * CUBE_SIZE;
                        if (i === 5) {
                            mesh.position.y = (-1 * dimension + k - 1) * CUBE_SIZE;
                        } else {
                            mesh.position.y = (1 * dimension + k - 1) * CUBE_SIZE;
                        }
                    }

                    let matrixIx;
                    switch (i) {
                        case 0:
                            matrixIx = k * dimension + j;
                            break;
                        case 1:
                            matrixIx = (dimension - 1) + (dimension * dimension) * j + k * dimension;
                            break;
                        case 2:
                            matrixIx = dimension * dimension * (dimension - 1) + k * dimension + (dimension - 1 - j);
                            break;
                        case 3:
                            matrixIx = dimension * dimension * (dimension - 1 - j) + k * dimension;
                            break;
                        case 4:
                            matrixIx = dimension * (dimension - 1) + dimension * dimension * j + (dimension - 1 - k);
                            break;
                        case 5:
                        default:
                            matrixIx = dimension * dimension * j + k;
                            break;
                    }
                    mesh.userData = matrixIx;

                    groupFlat.add(mesh);
                    meshesFlat.push(mesh);
                }
            }
        }

        toggleView();
        checkAndInitMatrix();
        rebuild();

        function checkAndInitMatrix(matrixArr) {
            matrix = [];
            let failed = true;

            if (matrixArr && matrixArr.length === TOTAL_SIZE * MATRIX_FIELD_LEN) {
                let used = Array(TOTAL_SIZE);
                failed = false;
                for (let i = 0; i < TOTAL_SIZE; ++i) {
                    let ix = Math.floor(matrixArr[i * MATRIX_FIELD_LEN]);
                    let rotateMask = Math.floor(matrixArr[i * MATRIX_FIELD_LEN + 1]);

                    if (ix < 0 || ix >= TOTAL_SIZE || used[ix]) {
                        matrix.splice(0);
                        failed = true;
                        break;
                    }
                    used[ix] = true;

                    let rotate = [];
                    for (let j = 0; j < 6; ++j) {
                        rotate.push((rotateMask & 7 << 3 * j) >> 3 * j);
                    }

                    matrix.push({
                        ix: ix,
                        rotate: rotate,
                    });
                }
            }

            if (failed) {
                for (let i = 0; i < TOTAL_SIZE; ++i) {
                    matrix.push({
                        ix: i,
                        rotate: [0, 1, 2, 3, 4, 5],
                    });
                }
            }

            return !failed;
        }

        function toggleView() {
            isFlatView = !isFlatView;
            if (isFlatView) {
                camera.position.set(0, 0, 45 * dimension + 10);
                scene.remove(group3d);
                scene.add(groupFlat);
            } else {
                camera.position.set(10 * dimension, 10 * dimension, 14 * dimension + 5);
                scene.remove(groupFlat);
                scene.add(group3d);
            }
            camera.lookAt(0, 0, 0);
        }

        function shuffle() {
            checkAndInitMatrix();
            for (let i = 0; i < 30; ++i) {
                let axis = [-1, -1, -1];
                axis[Math.floor(Math.random() * 3)] = Math.floor(Math.random() * dimension);
                let multiOf90 = Math.floor(Math.random() * 4);

                rotate(axis[0], axis[1], axis[2], multiOf90);
            }
        }

        this.serialize = function () {
            let ret = [];
            for (let i = 0; i < TOTAL_SIZE; ++i) {
                let rotateMask = 0;
                for (let j = 0; j < 6; ++j) {
                    rotateMask |= matrix[i].rotate[j] << 3 * j;
                }

                ret.push(matrix[i].ix);
                ret.push(rotateMask);
            }
            return ret;
        };

        this.unserialize = function (matrixArr) {
            if (animTid || moveHelper) {
                return false;
            }

            checkAndInitMatrix(matrixArr);
            rebuild();

            return true;
        };

        this.changeView = function () {
            if (animTid || moveHelper) {
                return false;
            }

            toggleView();

            return true;
        };

        this.shuffle = function () {
            if (animTid || moveHelper) {
                return false;
            }

            shuffle();

            return true;
        };

        function rebuild() {
            for (let i = 0; i < TOTAL_SIZE; ++i) {
                let ix = matrix[i].ix;
                let rotate = matrix[i].rotate;

                let colorPattern = colorPatterns[ix];

                let mats = [];
                for (let j = 0; j < 6; ++j) {
                    if ((colorPattern & (1 << rotate[j])) === 0) {
                        mats.push(new THREE.MeshBasicMaterial({color: 0x000000}));
                    } else {
                        mats.push(new THREE.MeshBasicMaterial({map: textures[rotate[j]]}));
                    }
                }
                meshes[i].material = mats;
            }

            for (let i = 0; i < meshesFlat.length; ++i) {
                let matrixIx = meshesFlat[i].userData;
                let color = matrix[matrixIx].rotate[showFace[Math.floor(i / (dimension * dimension))]];
                meshesFlat[i].material = new THREE.MeshBasicMaterial({map: textures[color]});
            }
        }

        function xyzOfMesh(mesh) {
            for (let x = 0; x < dimension; ++x) {
                for (let y = 0; y < dimension; ++y) {
                    for (let z = 0; z < dimension; ++z) {
                        if (meshes[x * dimension * dimension + y * dimension + z] === mesh) {
                            return {x: x, y: y, z: z};
                        }
                    }
                }
            }
        }

        this.startMoving = function (x, y) {
            if (moveHelper || isFlatView) {
                return false;
            }

            let x0 = (x / renderer.domElement.clientWidth) * 2 - 1;
            let y0 = -(y / renderer.domElement.clientHeight) * 2 + 1;

            let raycaster = new THREE.Raycaster();
            let mouse = new THREE.Vector2(x0, y0);

            raycaster.setFromCamera(mouse, camera);
            let intersects = raycaster.intersectObjects(meshes);

            if (intersects.length > 0) {
                moveHelper = new MoveHelper(intersects[0], x, windowHeight - y);
                return true;
            }

            return false;
        };

        this.moving = function (x, y) {
            if (animTid || !moveHelper) {
                return false;
            }

            moveHelper.move(x, windowHeight - y);

            return true;
        };

        this.endMoving = function (cb) {
            if (!moveHelper) {
                return false;
            }

            moveHelper.endMove(() => {
                moveHelper = null;

                cb && cb();
            });

            return true;
        };

        function MoveHelper(intersect, startX, startY) {
            let cood = xyzOfMesh(intersect.object);
            let face = intersect.face.normal;

            let pivot;
            let distFunc;

            let startRotation;
            let lastRotation;

            this.move = function (x, y) {
                if (!pivot) {
                    let isVertical = Math.abs(y - startY) >= Math.abs(x - startX);

                    if (face.x === 1) {
                        if (isVertical) {
                            pivot = pivotZ;
                            distFunc = (_, y1) => y1 - startY;
                        } else {
                            pivot = pivotY;
                            distFunc = (x1, _) => x1 - startX;
                        }
                    } else if (face.y === 1) {
                        if (isVertical) {
                            pivot = pivotX;
                            distFunc = (_, y1) => startY - y1;
                        } else {
                            pivot = pivotZ;
                            distFunc = (x1, _) => startX - x1;
                        }
                    } else {
                        if (isVertical) {
                            pivot = pivotX;
                            distFunc = (_, y1) => startY - y1;
                        } else {
                            pivot = pivotY;
                            distFunc = (x1, _) => x1 - startX;
                        }
                    }

                    if (pivot === pivotX) {
                        startRotation = lastRotation = pivot.rotation.x;
                    } else if (pivot === pivotY) {
                        startRotation = lastRotation = pivot.rotation.y;
                    } else {
                        startRotation = lastRotation = pivot.rotation.z;
                    }

                    for (let i = 0; i < dimension; ++i) {
                        for (let j = 0; j < dimension; ++j) {
                            for (let k = 0; k < dimension; ++k) {
                                if (pivot === pivotX && i === cood.x) {
                                    pivot.add(meshes[i * dimension * dimension + j * dimension + k]);
                                } else if (pivot === pivotY && j === cood.y) {
                                    pivot.add(meshes[i * dimension * dimension + j * dimension + k]);
                                } else if (pivot === pivotZ && k === cood.z) {
                                    pivot.add(meshes[i * dimension * dimension + j * dimension + k]);
                                }
                            }
                        }
                    }
                }

                let dist = distFunc(x, y);
                let distOf180 = Math.min(windowHeight, windowWidth) / 1.8;
                let degree = (dist / distOf180) * Math.PI;

                if (pivot === pivotX) {
                    lastRotation = pivot.rotation.x = startRotation + degree;
                } else if (pivot === pivotY) {
                    lastRotation = pivot.rotation.y = startRotation + degree;
                } else {
                    lastRotation = pivot.rotation.z = startRotation + degree;
                }

            };

            function rotateAnim(endRotation, cb) {
                if (animTid) {
                    return;
                }

                // 使弧度在0~π之间
                function narrowDown(radian) {
                    while (1) {
                        if (radian < 0) {
                            radian += Math.PI;
                        } else if (radian > Math.PI) {
                            radian -= Math.PI;
                        } else {
                            return radian;
                        }
                    }
                }

                let forward = narrowDown(endRotation - lastRotation);
                let backward = Math.PI - forward;

                let delta = Math.PI / 90;
                let frames;
                if (forward < backward) {
                    frames = Math.floor(forward / delta);
                } else {
                    frames = Math.floor(backward / delta);
                    delta *= -1;
                }

                let ix = 0;
                animTid = setInterval(() => {
                    if (ix++ === frames) {
                        clearInterval(animTid);
                        animTid = null;
                        cb();
                        return;
                    }

                    if (pivot === pivotX) {
                        lastRotation = pivot.rotation.x = lastRotation + delta;
                    } else if (pivot === pivotY) {
                        lastRotation = pivot.rotation.y = lastRotation + delta;
                    } else {
                        lastRotation = pivot.rotation.z = lastRotation + delta;
                    }

                }, 1000 / 60);
            }

            this.endMove = function (cb) {
                if (animTid || !pivot) {
                    return;
                }

                // 转了90的n倍
                let multiOf90 = 4;
                if (pivot === pivotX) {
                    multiOf90 += Math.floor((lastRotation - startRotation) / Math.PI * 2 + .5);
                } else if (pivot === pivotY) {
                    multiOf90 += Math.floor((lastRotation - startRotation) / Math.PI * 2 + .5);
                } else {
                    multiOf90 += Math.floor((lastRotation - startRotation) / Math.PI * 2 + .5);
                }
                multiOf90 %= 4;

                let targetRotation = startRotation + multiOf90 * Math.PI / 2;
                rotateAnim(targetRotation, () => {
                    let children = pivot.children.splice(0);
                    for (let child of children) {
                        child.parent = null;
                        group3d.add(child);
                    }
                    pivot.rotation.set(0, 0, 0);

                    let childIxs = children.map(c => c.userData);
                    if (multiOf90) {
                        rotate(pivot === pivotX ? cood.x : -1, pivot === pivotY ? cood.y : -1, pivot === pivotZ ? cood.z : -1, multiOf90, childIxs);
                    }

                    cb();
                });
            }
        }

        /**
         * 沿魔方的某一面（由axisX,axisY,axisZ决定）旋转multiOf90 * 90度
         *
         *      ^  y
         *      |
         *      |
         *      |
         *      |_________> x
         *     /
         *    /
         *   V  z
         *
         * @param axisX     如果该值>=0,沿着x=该值的面旋转
         * @param axisY     如果该值>=0,沿着y=该值的面旋转
         * @param axisZ     如果该值>=0,沿着z=该值的面旋转
         * @param multiOf90 从开始位置(按下位置)旋转90x该值的角度
         * @param childIxs  旋转面的所有mesh的索引
         */
        function rotate(axisX, axisY, axisZ, multiOf90, childIxs) {
            if (!childIxs) {
                childIxs = [];
                for (let x = 0; x < dimension; ++x) {
                    for (let y = 0; y < dimension; ++y) {
                        for (let z = 0; z < dimension; ++z) {
                            let ix = x * dimension * dimension + y * dimension + z;
                            if (axisX === x) {
                                childIxs.push(ix);
                            } else if (axisY === y) {
                                childIxs.push(ix);
                            } else if (axisZ === z) {
                                childIxs.push(ix);
                            }
                        }
                    }
                }
            }

            let m = [Array(childIxs.length), Array(childIxs.length)];

            for (let i = 0; i < childIxs.length; ++i) {
                m[0][i] = childIxs[i];
            }

            let ix = 0;
            for (let t = 0; t < multiOf90; ++t) {
                ix ^= 1;

                if (axisX >= 0) {
                    for (let i = 0; i < dimension; ++i) {
                        for (let j = 0; j < dimension; ++j) {
                            m[ix][i * dimension + j] = m[ix ^ 1][j * dimension + (dimension - 1 - i)];
                        }
                    }
                } else if (axisY >= 0) {
                    for (let i = 0; i < dimension; ++i) {
                        for (let j = 0; j < dimension; ++j) {
                            m[ix][i * dimension + j] = m[ix ^ 1][(dimension - 1 - j) * dimension + i];
                        }
                    }
                } else {
                    for (let i = 0; i < dimension; ++i) {
                        for (let j = 0; j < dimension; ++j) {
                            m[ix][i * dimension + j] = m[ix ^ 1][j * dimension + (dimension - 1 - i)];
                        }
                    }
                }
            }

            const rm = [
                [2, 5, 3, 4],
                [1, 5, 0, 4],
                [1, 2, 0, 3],
            ];

            function rotateFace(arr, rm) {
                let mat = arr[rm[0]];
                arr[rm[0]] = arr[rm[1]];
                arr[rm[1]] = arr[rm[2]];
                arr[rm[2]] = arr[rm[3]];
                arr[rm[3]] = mat;
            }

            let newMatrix = m[ix].map(i => matrix[i]);
            for (let i in childIxs) {
                let mat = matrix[childIxs[i]] = newMatrix[i];

                if (axisX >= 0) {
                    for (let j = 0; j < multiOf90; ++j) {
                        rotateFace(mat.rotate, rm[0]);
                    }
                } else if (axisY >= 0) {
                    for (let j = 0; j < multiOf90; ++j) {
                        rotateFace(mat.rotate, rm[1]);
                    }
                } else {
                    for (let j = 0; j < multiOf90; ++j) {
                        rotateFace(mat.rotate, rm[2]);
                    }
                }
            }
            rebuild();
        }
    }

    function initTextures(cb) {
        var canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        var context = canvas.getContext("2d");

        function roundRect(ctx, x, y, w, h, r) {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
            ctx.fill();
        }

        let images = Array(COLORS.length);

        function loadImage(ix) {
            context.strokeStyle = COLORS[ix];
            context.fillStyle = COLORS[ix];
            roundRect(context, 2, 2, 60, 60, 8);

            let image = new Image();
            image.src = canvas.toDataURL();
            image.onload = () => {

                images[ix] = image;

                if (ix === COLORS.length) {
                    cb(images);
                } else {
                    loadImage(ix + 1);
                }
            };
        }

        loadImage(0);
    }

    scope.init = function (rank) {

        function onresize() {
            windowWidth = window.innerWidth;
            windowHeight = window.innerHeight;

            camera.aspect = windowWidth / windowHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(windowWidth, windowHeight);
        }

        initTextures((images) => {

            scene.background = new THREE.Color(0xfff8ce);

            camera.lookAt(0, 0, 0);

            scene.add(camera);
            renderer.setSize(windowWidth, windowHeight);
            document.getElementById("WebGL-output").appendChild(renderer.domElement);
            document.addEventListener('mousedown', onMouseDown, false);
            document.addEventListener('mousemove', onMouseMove, false);
            document.addEventListener('mouseup', onMouseUp, false);
            document.addEventListener("touchstart", onTouchDown, false);
            document.addEventListener("touchmove", onTouchMove, false);
            document.addEventListener("touchend", onTouchUp, false);

            document.getElementById("btn-backward").onclick = onBackward;
            document.getElementById("btn-forward").onclick = onForward;
            document.getElementById("btn-reset").onclick = onReset;
            document.getElementById("btn-shuffle").onclick = onShuffle;
            document.getElementById("btn-flatview").onclick = onChangeView;
            document.getElementById("btn-3dview").onclick = onChangeView;
            scope.onresize = onresize;

            let textures = [];
            for (let image of images) {
                let texture = new THREE.Texture(image);
                texture.anisotropy = 4;
                texture.needsUpdate = true;

                textures.push(texture);
            }

            let cube = new RubiksCube(rank, textures);

            let history = [];
            let historyIx = 0;
            history.push(cube.serialize());

            function onMouseDown(event) {
                cube.startMoving(event.clientX, event.clientY);
            }

            function onMouseMove(event) {
                cube.moving(event.clientX, event.clientY);
            }

            function onMouseUp() {
                cube.endMoving(() => {
                    if (historyIx < history.length - 1) {
                        history.splice(historyIx + 1);
                    }
                    history.push(cube.serialize());
                    historyIx++;
                });
            }

            function onTouchDown(event) {
                let touch = event.targetTouches[0];
                if (cube.startMoving(touch.pageX, touch.pageY)) {
                    event.preventDefault();
                }
            }

            function onTouchMove(event) {
                let touch = event.targetTouches[0];
                if (cube.moving(touch.pageX, touch.pageY)) {
                    event.preventDefault();
                }
            }

            function onTouchUp(event) {
                if (cube.endMoving(() => {
                    if (historyIx < history.length - 1) {
                        history.splice(historyIx + 1);
                    }
                    history.push(cube.serialize());
                    historyIx++;
                })) {
                    event.preventDefault();
                }
            }

            function onBackward() {
                if (historyIx > 0) {
                    cube.unserialize(history[--historyIx]);
                }
            }

            function onForward() {
                if (historyIx < history.length - 1) {
                    cube.unserialize(history[++historyIx]);
                }
            }

            function onReset() {
                if (history.length > 1) {
                    history.splice(1);
                    cube.unserialize(history[historyIx = 0]);
                }
            }

            function onShuffle() {
                if (cube.shuffle()) {
                    history.splice(0);
                    historyIx = 0;
                    history.push(cube.serialize());
                }
            }

            function onChangeView() {
                let toggle = (dom) => {
                    let v = dom.style.visibility;
                    if (v === 'collapse') {
                        dom.style.visibility = 'visible';
                    } else {
                        dom.style.visibility = 'collapse';
                    }
                };

                toggle(document.getElementById("btn-flatview"));
                toggle(document.getElementById("btn-3dview"));
                cube.changeView();
            }

            function update() {
                renderer.render(scene, camera);
                requestAnimationFrame(update);
            }

            update();

        });
    };

})(window);
