# WEBGLWeekly8
## Screenshots:
wireframe
<img width="1045" height="578" alt="Screenshot 2026-10-29 at 1 16 48 PM" src="https://github.com/user-attachments/assets/2dd36424-db60-4521-a801-de7c7a136051" />
color maps
<img width="1049" height="562" alt="Screenshot 2026-10-29 at 1 16 54 PM" src="https://github.com/user-attachments/assets/ff22eb77-18bf-4b30-8786-a9cf9ba634dc" />
normal maps
<img width="1053" height="614" alt="Screenshot 2026-10-29 at 1 17 02 PM" src="https://github.com/user-attachments/assets/75934479-fdc8-4f7a-b2e3-b3d191f04724" />
Roughness maps
<img width="1033" height="631" alt="Screenshot 2026-10-29 at 1 17 20 PM" src="https://github.com/user-attachments/assets/e52877ab-c488-4357-a736-425089c78640" />
final:
<img width="1039" height="648" alt="Screenshot 2026-10-29 at 1 17 38 PM" src="https://github.com/user-attachments/assets/5b9298db-9bc4-4f53-8113-ad938d47b0f4" />


1. Which textures did you choose and why?
I chose cobblestone (aerial_rocks_02) for the ground, red castle brick (castle_brick_02_red) for the courtyard walls and towers, weathered wood planks (wood_planks) for the gate and storage crates, patterned cloth (fabric_pattern_07) for the hanging banners, and corrugated iron (corrugated_iron) for the reinforced barrel. These materials naturally belong to a medieval courtyard and provide a wide range of surface characteristics—from rough, matte stone and weathered timber to reflective metal and woven fabric.

2. How did normal maps improve your scene?
Normal maps added convincing surface depth and micro-detail without adding extra polygons to the basic box and plane geometries. With normal maps active, the mortar grooves between the castle bricks and the gaps between the cobblestones catch the directional light and create small-scale surface shadows, eliminating the flat, "wallpapered" appearance of color maps alone.

3. Which object benefited the most from texture mapping?
The ground plane and castle walls benefited the most. Because they are large, flat primitives (PlaneGeometry and BoxGeometry), they looked completely artificial with basic colors. Combining color, normal, roughness, and ambient occlusion maps transformed them into believable, weathered masonry.

4. What effect did roughness maps have on lighting?
Roughness maps controlled how sharply or softly the directional sunlight scattered across different parts of each surface. On the cobblestone ground and brick walls, the roughness map prevented uniform plastic-looking specular shine by making mortar and dirt crevices completely matte while allowing the raised, polished tops of stones and metallic barrel bands to catch subtle highlights.

5. Did texture tiling improve or hurt realism?
Texture tiling (THREE.RepeatWrapping) significantly improved realism, particularly on the 100x100 ground plane and the wide castle walls. Without tiling (repeat.set(1, 1)), the stone texture stretched across the entire courtyard, making individual pebbles look like giant blurry boulders. Setting the ground repeat to (10, 10) and the wall repeat to (4, 2) scaled the stones and bricks to realistic proportions relative to the crates and gate.

6. If you had more time, what additional textures would you add?
If I had more time, I would add a displacement map (with higher-segment geometry) to physically push out the silhouette of the stone walls and ground, an alpha/opacity map to create tattered edges on the hanging fabric banners, and an equirectangular HDRI skybox texture for realistic outdoor background reflections.

sources:
Aerial Rocks 02 (Cobblestone Ground)
Poly Haven
[https://polyhaven.com/a/aerial_rocks_02](https://polyhaven.com/a/aerial_rocks_02)

Castle Brick 02 Red (Castle Wall)
Poly Haven
[https://polyhaven.com/a/castle_brick_02_red](https://polyhaven.com/a/castle_brick_02_red)

Wood Planks (Wooden Gate & Crates)
Poly Haven
[https://polyhaven.com/a/wood_planks](https://polyhaven.com/a/wood_planks)

Fabric Pattern 07 (Decorative Banner)
Poly Haven
[https://polyhaven.com/a/fabric_pattern_07](https://polyhaven.com/a/fabric_pattern_07)

Corrugated Iron (Metal Barrel)
Poly Haven
[https://polyhaven.com/a/corrugated_iron](https://polyhaven.com/a/corrugated_iron)
