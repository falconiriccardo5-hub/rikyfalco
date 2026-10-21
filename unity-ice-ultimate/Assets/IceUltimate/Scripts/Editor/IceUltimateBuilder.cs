using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;
#if ICE_URP
using UnityEngine.Rendering.Universal;
#endif

namespace IceUltimate.EditorTools
{
    /// <summary>
    /// Costruisce dentro Unity tutto l'effetto "Ice Ultimate":
    /// materiali, moduli (prefab con particle system), prefab principale con
    /// Animator + clip "IceUltimate_Cast" (curve + Animation Event) e scena demo.
    ///
    /// Menu: Tools > Ice Ultimate > Build Prefab + Demo Scene
    ///
    /// Rieseguirlo aggiorna i materiali esistenti (i riferimenti restano validi) e
    /// RIGENERA prefab, clip e scena demo in Assets/IceUltimate/Generated: le
    /// modifiche fatte a mano a quei file vanno perse. Per personalizzare,
    /// duplica il prefab o modifica direttamente i file generati senza rilanciare.
    /// </summary>
    public static class IceUltimateBuilder
    {
        const string Root = "Assets/IceUltimate";
        const string Gen = Root + "/Generated";
        const string MatDir = Gen + "/Materials";
        const string PrefabDir = Gen + "/Prefabs";
        const string ModuleDir = Gen + "/Prefabs/Modules";
        const string AnimDir = Gen + "/Animation";

        static readonly Color Ice = new Color(0.8f, 0.88f, 0.97f);
        static readonly Color Deep = new Color(0.5f, 0.63f, 0.86f);
        static readonly Color White = new Color(0.95f, 0.97f, 1f);
        static readonly Color FrostC = new Color(0.6f, 0.73f, 0.92f);

        // Il layout replica la scena Godot con l'asse Z invertito (Unity e' left-handed):
        // il bersaglio e' all'origine, il caster in basso a destra rispetto alla camera.
        static readonly Vector3 CasterOffset = new Vector3(2.6f, 0f, -5f);
        static readonly Vector3[] EnemyPositions = { new Vector3(-3.4f, 0f, 3f), new Vector3(0.4f, 0f, 5f), new Vector3(2.6f, 0f, 3.6f) };

        static Mesh _quad, _sphere;
        static Texture2D _noise;

        // ================================================================= menu
        [MenuItem("Tools/Ice Ultimate/Build Prefab + Demo Scene", priority = 0)]
        public static void BuildAll()
        {
            var prefab = BuildPrefab();
            if (prefab) BuildDemoScene(prefab);
        }

        [MenuItem("Tools/Ice Ultimate/Build Prefab Only", priority = 1)]
        public static GameObject BuildPrefab()
        {
            try
            {
                EditorUtility.DisplayProgressBar("Ice Ultimate", "Impostazioni di import...", 0.05f);
                EnsureFolders();
                ConfigureImporters();
                _quad = Resources.GetBuiltinResource<Mesh>("Quad.fbx");
                _sphere = Resources.GetBuiltinResource<Mesh>("Sphere.fbx");
                _noise = Tex("noise_fbm");

                EditorUtility.DisplayProgressBar("Ice Ultimate", "Moduli...", 0.3f);
                var modules = new Dictionary<string, GameObject>
                {
                    ["TargetFlares"] = SaveModule(BuildTargetFlares()),
                    ["MagicCircle"] = SaveModule(BuildMagicCircle()),
                    ["CastFrost"] = SaveModule(BuildCastFrost()),
                    ["IceOrb"] = SaveModule(BuildIceOrb()),
                    ["ImpactBurst"] = SaveModule(BuildImpact()),
                    ["RingOrb"] = SaveModule(BuildRingOrb()),
                    ["ChargeCore"] = SaveModule(BuildChargeCore()),
                    ["Detonation"] = SaveModule(BuildDetonation()),
                    ["CrystalEruption"] = SaveModule(BuildCrystalEruption()),
                };

                EditorUtility.DisplayProgressBar("Ice Ultimate", "Prefab e animazione...", 0.8f);
                var prefab = BuildMaster(modules);
                AssetDatabase.SaveAssets();
                Debug.Log("[Ice Ultimate] Prefab generato: " + AssetDatabase.GetAssetPath(prefab));
                return prefab;
            }
            finally
            {
                EditorUtility.ClearProgressBar();
            }
        }

        // ================================================================= import
        static void EnsureFolders()
        {
            foreach (var dir in new[] { Gen, MatDir, PrefabDir, ModuleDir, AnimDir, Gen + "/Scenes" })
            {
                if (AssetDatabase.IsValidFolder(dir)) continue;
                var parent = Path.GetDirectoryName(dir).Replace('\\', '/');
                AssetDatabase.CreateFolder(parent, Path.GetFileName(dir));
            }
        }

        /// <summary>Impostazioni di import di texture e modelli (idempotente).</summary>
        static void ConfigureImporters()
        {
            var texDirs = new[] { Root + "/Art/Textures", Root + "/Art/Flipbooks" };
            foreach (var guid in AssetDatabase.FindAssets("t:Texture2D", texDirs))
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                if (!(AssetImporter.GetAtPath(path) is TextureImporter ti)) continue;
                bool tiled = path.Contains("noise_fbm") || path.Contains("floor_checker");
                bool flipbook = path.Contains("/Flipbooks/");
                bool dirty = false;
                void Set<T>(T current, T wanted, Action<T> apply)
                {
                    if (!EqualityComparer<T>.Default.Equals(current, wanted)) { apply(wanted); dirty = true; }
                }
                Set(ti.textureType, TextureImporterType.Default, v => ti.textureType = v);
                Set(ti.alphaSource, path.Contains("floor_checker") ? TextureImporterAlphaSource.None : TextureImporterAlphaSource.FromInput, v => ti.alphaSource = v);
                Set(ti.alphaIsTransparency, !path.Contains("floor_checker") && !path.Contains("noise_fbm"), v => ti.alphaIsTransparency = v);
                Set(ti.wrapMode, tiled ? TextureWrapMode.Repeat : TextureWrapMode.Clamp, v => ti.wrapMode = v);
                Set(ti.mipmapEnabled, true, v => ti.mipmapEnabled = v);
                Set(ti.sRGBTexture, !path.Contains("noise_fbm"), v => ti.sRGBTexture = v);
                Set(ti.maxTextureSize, flipbook ? 2048 : 1024, v => ti.maxTextureSize = v);
                Set(ti.textureCompression, TextureImporterCompression.CompressedHQ, v => ti.textureCompression = v);
                if (dirty) ti.SaveAndReimport();
            }

            var casterPath = Root + "/Art/Models/caster.fbx";
            if (AssetImporter.GetAtPath(casterPath) is ModelImporter mi)
            {
                mi.animationType = ModelImporterAnimationType.Generic;
                mi.importAnimation = true;
                var clips = mi.clipAnimations.Length > 0 ? mi.clipAnimations : mi.defaultClipAnimations;
                foreach (var c in clips)
                {
                    bool idle = c.name.ToLowerInvariant().Contains("idle");
                    c.loopTime = idle;
                    c.name = idle ? "Idle" : c.name.ToLowerInvariant().Contains("cast") ? "Cast" : c.name;
                }
                mi.clipAnimations = clips;
                mi.SaveAndReimport();
            }
        }

        // ================================================================= assets
        static Texture2D Tex(string n) => AssetDatabase.LoadAssetAtPath<Texture2D>($"{Root}/Art/Textures/{n}.png");
        static Texture2D Flip(string n) => AssetDatabase.LoadAssetAtPath<Texture2D>($"{Root}/Art/Flipbooks/{n}_8x8.png");

        static Mesh ModelMesh(string n) =>
            AssetDatabase.LoadAllAssetsAtPath($"{Root}/Art/Models/{n}.fbx").OfType<Mesh>().FirstOrDefault();

        /// <summary>Crea o aggiorna un materiale (aggiornare mantiene validi i riferimenti).</summary>
        static Material Mat(string name, string shader, Action<Material> setup)
        {
            var path = $"{MatDir}/{name}.mat";
            var sh = Shader.Find(shader);
            if (!sh) throw new Exception($"Shader '{shader}' non trovato: controlla gli errori di compilazione degli shader.");
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (!m)
            {
                m = new Material(sh);
                AssetDatabase.CreateAsset(m, path);
            }
            m.shader = sh;
            setup(m);
            EditorUtility.SetDirty(m);
            return m;
        }

        static Material Additive(string name, Texture tex, Color color, float intensity, bool billboard, float spin = 0f, float soft = 0f) =>
            Mat(name, "IceUltimate/Additive", m =>
            {
                m.SetTexture("_MainTex", tex);
                m.SetColor("_Color", color);
                m.SetFloat("_Intensity", intensity);
                m.SetFloat("_Billboard", billboard ? 1f : 0f);
                m.SetFloat("_Spin", spin);
                m.SetFloat("_SoftFade", soft);
            });

        // ================================================================= scene helpers
        static GameObject Node(Transform parent, string name, Vector3 pos = default)
        {
            var go = new GameObject(name);
            if (parent) go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            return go;
        }

        static GameObject MeshObj(Transform parent, string name, Mesh mesh, Material mat, Vector3 pos, Vector3 euler, Vector3 scale)
        {
            var go = Node(parent, name, pos);
            go.transform.localRotation = Quaternion.Euler(euler);
            go.transform.localScale = scale;
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterial = mat;
            mr.shadowCastingMode = ShadowCastingMode.Off;
            mr.receiveShadows = false;
            mr.lightProbeUsage = LightProbeUsage.Off;
            mr.reflectionProbeUsage = ReflectionProbeUsage.Off;
            return go;
        }

        static string _module = "";

        static GameObject Sprite(Transform parent, string name, string tex, float size, Color color, float intensity, Vector3 pos = default, float spin = 0f) =>
            MeshObj(parent, name, _quad, Additive($"{_module}_{name}", Tex(tex), color, intensity, true, spin), pos, Vector3.zero, Vector3.one * size);

        static GameObject Ground(Transform parent, string name, string tex, float size, Color color, float intensity, float y,
            float reveal = 1f, float edgeBoost = 3f, float edgeWidth = 0.08f, float noiseAmount = 0.12f, float pulseSpeed = 0f, float pulseAmount = 0.25f)
        {
            var mat = Mat($"{_module}_{name}", "IceUltimate/GroundLayer", m =>
            {
                m.SetTexture("_MainTex", Tex(tex));
                m.SetTexture("_NoiseTex", _noise);
                m.SetColor("_Color", color);
                m.SetFloat("_Intensity", intensity);
                m.SetFloat("_Reveal", reveal);
                m.SetFloat("_EdgeBoost", edgeBoost);
                m.SetFloat("_EdgeWidth", edgeWidth);
                m.SetFloat("_NoiseAmount", noiseAmount);
                m.SetFloat("_PulseSpeed", pulseSpeed);
                m.SetFloat("_PulseAmount", pulseAmount);
            });
            return MeshObj(parent, name, _quad, mat, new Vector3(0, y, 0), new Vector3(90, 0, 0), Vector3.one * size);
        }

        struct ArcP
        {
            public float radius, thickness, arcLength, spin, offset, chroma, tailFade;
            public bool billboard;
            public Color color;
        }

        static ArcP A(float radius, float thickness, float arcLength, float spin = 0f, float offset = 0f, float chroma = 0f,
            bool billboard = false, Color? color = null, float tailFade = 0.85f) =>
            new ArcP { radius = radius, thickness = thickness, arcLength = arcLength, spin = spin, offset = offset, chroma = chroma, billboard = billboard, color = color ?? Ice, tailFade = tailFade };

        static GameObject Arc(Transform parent, string name, float size, ArcP p, Vector3 euler = default, Vector3 pos = default)
        {
            var mat = Mat($"{_module}_{name}", "IceUltimate/ArcRing", m =>
            {
                m.SetColor("_Color", p.color);
                m.SetFloat("_Intensity", 0f);
                m.SetFloat("_Radius", p.radius);
                m.SetFloat("_Thickness", p.thickness);
                m.SetFloat("_ArcLength", p.arcLength);
                m.SetFloat("_ArcOffset", p.offset);
                m.SetFloat("_SpinSpeed", p.spin);
                m.SetFloat("_TailFade", p.tailFade);
                m.SetFloat("_Billboard", p.billboard ? 1f : 0f);
                m.SetFloat("_ChromaFringe", p.chroma);
            });
            return MeshObj(parent, name, _quad, mat, pos, euler, Vector3.one * size);
        }

        static GameObject Trail(Transform parent, string name, string mesh, float autoSpeed, float trailLength, float edgePower,
            Vector3 pos, Vector3 euler, Vector3 scale, Color? color = null)
        {
            var mat = Mat($"{_module}_{name}", "IceUltimate/Trail", m =>
            {
                m.SetTexture("_NoiseTex", _noise);
                m.SetColor("_Color", color ?? Ice);
                m.SetFloat("_Intensity", 0f);
                m.SetFloat("_AutoSpeed", autoSpeed);
                m.SetFloat("_TrailLength", trailLength);
                m.SetFloat("_EdgePower", edgePower);
            });
            return MeshObj(parent, name, ModelMesh(mesh), mat, pos, euler, scale);
        }

        static GameObject Orb(Transform parent, string name, float radius, float rimPower, float core, float iridescence, Vector3 pos = default)
        {
            var mat = Mat($"{_module}_{name}", "IceUltimate/FresnelOrb", m =>
            {
                m.SetTexture("_NoiseTex", _noise);
                m.SetFloat("_Intensity", 0f);
                m.SetFloat("_RimPower", rimPower);
                m.SetFloat("_CoreAmount", core);
                m.SetFloat("_Iridescence", iridescence);
            });
            return MeshObj(parent, name, _sphere, mat, pos, Vector3.zero, Vector3.one * radius * 2f);
        }

        static Material CrystalMat(string name, float emission, float opacity) =>
            Mat(name, "IceUltimate/Crystal", m =>
            {
                m.SetTexture("_NoiseTex", _noise);
                m.SetColor("_Tint", new Color(0.7f, 0.85f, 1f));
                m.SetFloat("_Emission", emission);
                m.SetFloat("_Opacity", opacity);
            });

        // ================================================================= particles
        enum Shape { Sphere, Ring, Box, ConeUp, FlatRadial }

        /// <summary>Configurazione compatta di un Particle System (valori tradotti da Godot).</summary>
        class PS
        {
            public bool oneShot;
            public int count = 32;
            public float lifeMin = 1f, lifeMax = 1f;
            public float speedMin, speedMax;
            public float sizeMin = 0.2f, sizeMax = 0.2f;
            public Shape shape = Shape.Sphere;
            public float radius = 0.1f, innerRadius;
            public Vector3 box = Vector3.one;
            public float coneAngle = 25f;
            public float gravity;               // m/s^2 verso il basso (come Godot)
            public float drag;
            public float upVelocity;
            public bool randomRotation;
            public float angularVel;            // gradi/s (random +-)
            public bool stretch;
            public float lengthScale = 2f, velocityScale = 0.06f;
            public Gradient color;
            public AnimationCurve size;
            public bool flipbook;
            public Material material;
            public Vector3 pos;
        }

        static Gradient SparkGradient() => G(new[] { (0f, Color.white), (0.35f, Ice), (1f, Deep) }, new[] { (0f, 1f), (0.35f, 0.9f), (1f, 0f) });

        static Gradient FadeGradient(Color c, float peak) => G(new[] { (0f, c), (1f, c) }, new[] { (0f, 0f), (0.1f, peak), (0.6f, peak * 0.6f), (1f, 0f) });

        static Gradient G((float t, Color c)[] colors, (float t, float a)[] alphas)
        {
            var g = new Gradient();
            g.SetKeys(colors.Select(k => new GradientColorKey(k.c, k.t)).ToArray(), alphas.Select(k => new GradientAlphaKey(k.a, k.t)).ToArray());
            return g;
        }

        static AnimationCurve Pop() => new AnimationCurve(new Keyframe(0f, 0f), new Keyframe(0.15f, 1f), new Keyframe(1f, 0.3f));
        static AnimationCurve Grow(float from = 0.4f) => AnimationCurve.Linear(0f, from, 1f, 1f);

        static ParticleSystem Particles(Transform parent, string name, PS c)
        {
            var go = Node(parent, name, c.pos);
            var ps = go.AddComponent<ParticleSystem>();
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var r = go.GetComponent<ParticleSystemRenderer>();

            var main = ps.main;
            main.playOnAwake = false;
            main.loop = !c.oneShot;
            main.duration = c.oneShot ? 1f : Mathf.Max(c.lifeMax, 1f);
            main.startLifetime = new ParticleSystem.MinMaxCurve(c.lifeMin, c.lifeMax);
            main.startSpeed = new ParticleSystem.MinMaxCurve(c.speedMin, c.speedMax);
            main.startSize = new ParticleSystem.MinMaxCurve(c.sizeMin, c.sizeMax);
            main.startRotation = c.randomRotation ? new ParticleSystem.MinMaxCurve(-Mathf.PI, Mathf.PI) : new ParticleSystem.MinMaxCurve(0f);
            main.startColor = Color.white;
            main.gravityModifier = c.gravity / 9.81f;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.scalingMode = ParticleSystemScalingMode.Hierarchy;
            main.maxParticles = Mathf.Max(c.count * 2, 8);

            var em = ps.emission;
            em.enabled = true;
            if (c.oneShot)
            {
                em.rateOverTime = 0f;
                em.SetBursts(new[] { new ParticleSystem.Burst(0f, (short)c.count) });
            }
            else
            {
                em.rateOverTime = c.count / Mathf.Max((c.lifeMin + c.lifeMax) * 0.5f, 0.05f);
            }

            var sh = ps.shape;
            sh.enabled = true;
            switch (c.shape)
            {
                case Shape.Sphere:
                    sh.shapeType = ParticleSystemShapeType.Sphere;
                    sh.radius = Mathf.Max(c.radius, 0.001f);
                    sh.radiusThickness = 1f;
                    break;
                case Shape.Ring:
                    sh.shapeType = ParticleSystemShapeType.Circle;
                    sh.radius = c.radius;
                    sh.radiusThickness = 1f - Mathf.Clamp01(c.innerRadius / Mathf.Max(c.radius, 0.001f));
                    sh.rotation = new Vector3(90f, 0f, 0f);
                    break;
                case Shape.FlatRadial:
                    sh.shapeType = ParticleSystemShapeType.Circle;
                    sh.radius = Mathf.Max(c.radius, 0.001f);
                    sh.radiusThickness = 1f;
                    sh.rotation = new Vector3(90f, 0f, 0f);
                    break;
                case Shape.Box:
                    sh.shapeType = ParticleSystemShapeType.Box;
                    sh.rotation = new Vector3(-90f, 0f, 0f);         // +Z del box = alto
                    sh.scale = new Vector3(c.box.x, c.box.z, c.box.y);
                    break;
                case Shape.ConeUp:
                    sh.shapeType = ParticleSystemShapeType.Cone;
                    sh.angle = c.coneAngle;
                    sh.radius = Mathf.Max(c.radius, 0.001f);
                    sh.radiusThickness = 1f;
                    sh.rotation = new Vector3(-90f, 0f, 0f);
                    break;
            }

            if (c.drag > 0f)
            {
                var lv = ps.limitVelocityOverLifetime;
                lv.enabled = true;
                lv.limit = 1000f;
                lv.drag = c.drag;
                lv.multiplyDragByParticleSize = false;
                lv.multiplyDragByParticleVelocity = false;
            }
            if (c.upVelocity != 0f)
            {
                var vel = ps.velocityOverLifetime;
                vel.enabled = true;
                vel.space = ParticleSystemSimulationSpace.World;
                vel.x = new ParticleSystem.MinMaxCurve(0f);
                vel.y = new ParticleSystem.MinMaxCurve(c.upVelocity);
                vel.z = new ParticleSystem.MinMaxCurve(0f);
            }
            if (c.color != null)
            {
                var col = ps.colorOverLifetime;
                col.enabled = true;
                col.color = new ParticleSystem.MinMaxGradient(c.color);
            }
            if (c.size != null)
            {
                var sol = ps.sizeOverLifetime;
                sol.enabled = true;
                sol.size = new ParticleSystem.MinMaxCurve(1f, c.size);
            }
            if (c.angularVel != 0f)
            {
                var rol = ps.rotationOverLifetime;
                rol.enabled = true;
                rol.z = new ParticleSystem.MinMaxCurve(-c.angularVel * Mathf.Deg2Rad, c.angularVel * Mathf.Deg2Rad);
            }

            var streams = new List<ParticleSystemVertexStream>
            {
                ParticleSystemVertexStream.Position, ParticleSystemVertexStream.Color, ParticleSystemVertexStream.UV,
            };
            if (c.flipbook)
            {
                var ts = ps.textureSheetAnimation;
                ts.enabled = true;
                ts.mode = ParticleSystemAnimationMode.Grid;
                ts.numTilesX = 8;
                ts.numTilesY = 8;
                ts.animation = ParticleSystemAnimationType.WholeSheet;
                ts.frameOverTime = new ParticleSystem.MinMaxCurve(1f, AnimationCurve.Linear(0f, 0f, 1f, 1f));
                ts.cycleCount = 1;
                streams.Add(ParticleSystemVertexStream.UV2);
                streams.Add(ParticleSystemVertexStream.AnimBlend);
            }
            r.SetActiveVertexStreams(streams);
            r.renderMode = c.stretch ? ParticleSystemRenderMode.Stretch : ParticleSystemRenderMode.Billboard;
            if (c.stretch)
            {
                r.lengthScale = c.lengthScale;
                r.velocityScale = c.velocityScale;
            }
            r.sharedMaterial = c.material;
            r.shadowCastingMode = ShadowCastingMode.Off;
            r.receiveShadows = false;
            r.maxParticleSize = 5f;
            r.alignment = ParticleSystemRenderSpace.View;
            return ps;
        }

        static Material SmokeMat(string name, float intensity, string flipbook = "smoke_puff") =>
            Additive($"{_module}_{name}", Flip(flipbook), Ice, intensity, false, 0f, 1.2f);

        static Material GlowDotMat(string name, float intensity) => Additive($"{_module}_{name}", Tex("soft_glow"), White, intensity, false);

        // ================================================================= modules
        static GameObject ModuleRoot<T>(string name) where T : Component
        {
            _module = name;
            var go = new GameObject(name);
            go.AddComponent<T>();
            return go;
        }

        static GameObject SaveModule(GameObject go)
        {
            var path = $"{ModuleDir}/{go.name}.prefab";
            var prefab = PrefabUtility.SaveAsPrefabAsset(go, path);
            UnityEngine.Object.DestroyImmediate(go);
            return prefab;
        }

        static GameObject BuildTargetFlares()
        {
            var root = ModuleRoot<TargetFlares>("TargetFlares");
            var red = new Color(1f, 0.12f, 0.08f);
            var spots = new[] { new Vector3(-3.4f, 1.1f, 3f), new Vector3(0.4f, 1f, 5f), new Vector3(2.6f, 1.2f, 3.6f) };
            var star = Additive("TargetFlares_Star", Tex("star_flare"), red, 0f, true);
            var streak = Additive("TargetFlares_Streak", Tex("anamorphic_flare"), red, 0f, true);
            for (int i = 0; i < spots.Length; i++)
            {
                var g = Node(root.transform, $"Target{i + 1}", spots[i]);
                MeshObj(g.transform, "Star", _quad, star, Vector3.zero, Vector3.zero, Vector3.one * 1.4f);
                MeshObj(g.transform, "Streak", _quad, streak, Vector3.zero, Vector3.zero, new Vector3(7f, 0.7f, 1f));
            }
            return root;
        }

        static GameObject BuildCastFrost()
        {
            var root = ModuleRoot<CastFrost>("CastFrost");
            var t = root.transform;
            Ground(t, "FrostDecal", "frost_ground", 5.5f, FrostC, 1.1f, 0.02f, reveal: 0f, edgeBoost: 2.5f, noiseAmount: 0.18f);
            Ground(t, "Cracks", "ground_cracks", 4.5f, Ice, 2.4f, 0.03f, reveal: 0f, edgeBoost: 1.5f);
            Sprite(t, "Snowflake", "snowflake", 1.3f, White, 0f, new Vector3(-0.5f, 1.7f, 0.4f), 1.4f);
            Sprite(t, "Glow", "soft_glow", 2.6f, Deep, 0f, new Vector3(-0.5f, 1.6f, 0.4f));
            var sw = Node(t, "Swirl").transform;
            Trail(sw, "ArcA", "swirl_ribbon", 0.9f, 0.7f, 1.5f, new Vector3(0, 0.05f, 0), Vector3.zero, new Vector3(1.9f, 2.2f, 1.9f));
            Trail(sw, "ArcB", "swirl_ribbon", 1.2f, 0.5f, 2.5f, new Vector3(0, 0.3f, 0), new Vector3(0, 120f, 0), new Vector3(1.4f, 1.9f, 1.4f));
            Trail(sw, "ArcC", "swirl_ribbon", 0.7f, 0.6f, 3f, Vector3.zero, new Vector3(0, 240f, 0), new Vector3(2.4f, 1.4f, 2.4f));
            Particles(t, "Sparks", new PS
            {
                oneShot = true, count = 70, lifeMin = 0.6f, lifeMax = 0.9f, speedMin = 3f, speedMax = 8f, sizeMin = 0.06f, sizeMax = 0.12f,
                shape = Shape.Sphere, radius = 0.4f, gravity = 5f, drag = 2f, stretch = true, lengthScale = 3f, color = SparkGradient(),
                material = Additive("CastFrost_Sparks", Tex("soft_glow"), White, 5f, false), pos = new Vector3(0, 0.9f, 0),
            });
            Particles(t, "Mist", new PS
            {
                count = 24, lifeMin = 1.2f, lifeMax = 1.8f, speedMin = 0.2f, speedMax = 0.8f, sizeMin = 1.4f, sizeMax = 2.6f,
                shape = Shape.Ring, radius = 1.3f, innerRadius = 0.3f, randomRotation = true, angularVel = 30f,
                color = FadeGradient(new Color(0.75f, 0.85f, 1f), 0.4f), size = Grow(0.5f), flipbook = true,
                material = SmokeMat("Mist", 1f), pos = new Vector3(0, 0.4f, 0),
            });
            Particles(t, "Dust", new PS
            {
                count = 50, lifeMin = 0.8f, lifeMax = 1.2f, speedMin = 0.5f, speedMax = 2f, sizeMin = 0.04f, sizeMax = 0.1f,
                shape = Shape.Box, box = new Vector3(2.6f, 0.4f, 2.6f), size = Pop(), color = SparkGradient(),
                material = GlowDotMat("Dust", 4f),
            });
            return root;
        }

        static GameObject BuildIceOrb()
        {
            var root = ModuleRoot<IceOrb>("IceOrb");
            var t = root.transform;
            Orb(t, "Core", 0.3f, 2.5f, 0.6f, 0.5f);
            Sprite(t, "Glow", "soft_glow", 2.2f, Ice, 0f);
            Sprite(t, "Snowflake", "snowflake", 1f, White, 0f, Vector3.zero, 2.5f);
            var arcs = Node(t, "Arcs").transform;
            Arc(arcs, "ArcA", 1.5f, A(0.42f, 0.02f, 0.45f, 1.8f, chroma: 0.004f));
            Arc(arcs, "ArcB", 1.3f, A(0.42f, 0.025f, 0.35f, -2.4f, 0.4f), new Vector3(70, 20, 0));
            Arc(arcs, "ArcC", 1.8f, A(0.42f, 0.015f, 0.3f, 1.2f, 0.7f, 0.006f), new Vector3(20, 80, 40));
            Trail(arcs, "RibbonA", "swirl_ribbon", 1.8f, 0.6f, 1.5f, new Vector3(0, -0.55f, 0), Vector3.zero, new Vector3(1.3f, 1.1f, 1.3f));
            Trail(arcs, "RibbonB", "swirl_ribbon", 2.3f, 0.5f, 2.5f, new Vector3(0, 0, 0.5f), new Vector3(90, 0, 0), new Vector3(1.1f, 1f, 1.1f));
            Particles(t, "Trail", new PS
            {
                count = 90, lifeMin = 0.6f, lifeMax = 0.9f, speedMin = 0.3f, speedMax = 1.2f, sizeMin = 0.05f, sizeMax = 0.12f,
                shape = Shape.Sphere, radius = 0.35f, gravity = 1f, size = Pop(), color = SparkGradient(), material = GlowDotMat("Trail", 4f),
            });
            Particles(t, "MistTrail", new PS
            {
                count = 30, lifeMin = 0.8f, lifeMax = 1f, sizeMin = 0.8f, sizeMax = 1.6f, shape = Shape.Sphere, radius = 0.25f,
                randomRotation = true, size = Grow(), color = FadeGradient(Ice, 0.3f), flipbook = true, material = SmokeMat("MistTrail", 1f),
            });
            return root;
        }

        static GameObject BuildImpact()
        {
            var root = ModuleRoot<ImpactBurst>("ImpactBurst");
            var t = root.transform;
            Sprite(t, "Flash", "star_flare", 4.5f, White, 0f);
            Sprite(t, "Glow", "soft_glow", 5f, Ice, 0f);
            var rings = Node(t, "Rings").transform;
            var rots = new[] { Vector3.zero, new Vector3(90, 0, 0), new Vector3(40, 60, 0), new Vector3(-30, -50, 20) };
            for (int i = 0; i < rots.Length; i++)
                Arc(rings, $"Ring{i + 1}", 1f, A(0.45f, 0.03f, 0.7f, 0.6f, i * 0.25f, 0.008f), rots[i]);
            Particles(t, "Sparks", new PS
            {
                oneShot = true, count = 90, lifeMin = 0.5f, lifeMax = 0.7f, speedMin = 4f, speedMax = 11f, sizeMin = 0.06f, sizeMax = 0.12f,
                shape = Shape.Sphere, radius = 0.3f, drag = 4f, stretch = true, lengthScale = 3f, color = SparkGradient(),
                material = Additive("ImpactBurst_Sparks", Tex("soft_glow"), White, 6f, false),
            });
            Particles(t, "Explosion", new PS
            {
                oneShot = true, count = 4, lifeMin = 0.9f, lifeMax = 1.1f, speedMin = 0.5f, speedMax = 1.5f, sizeMin = 2.6f, sizeMax = 3.6f,
                shape = Shape.Sphere, radius = 0.3f, drag = 1f, randomRotation = true, color = FadeGradient(White, 1f), flipbook = true,
                material = Additive("ImpactBurst_Explosion", Flip("explosion"), Ice, 0.6f, false, 0f, 0.8f),
            });
            Particles(t, "Smoke", new PS
            {
                oneShot = true, count = 20, lifeMin = 1.4f, lifeMax = 1.8f, speedMin = 1f, speedMax = 3f, sizeMin = 2f, sizeMax = 3.5f,
                shape = Shape.Sphere, radius = 0.5f, drag = 1.2f, randomRotation = true, size = Grow(), flipbook = true,
                color = FadeGradient(new Color(0.8f, 0.88f, 1f), 0.4f), material = SmokeMat("Smoke", 1.2f),
            });
            Particles(t, "Flakes", new PS
            {
                oneShot = true, count = 24, lifeMin = 1f, lifeMax = 1.2f, speedMin = 2f, speedMax = 5f, sizeMin = 0.15f, sizeMax = 0.3f,
                shape = Shape.Sphere, radius = 0.1f, gravity = 2f, drag = 1.5f, randomRotation = true, angularVel = 200f,
                color = SparkGradient(), material = Additive("ImpactBurst_Flakes", Tex("snowflake"), White, 3f, false),
            });
            return root;
        }

        static GameObject BuildRingOrb()
        {
            var root = ModuleRoot<RingOrb>("RingOrb");
            var t = root.transform;
            Orb(t, "Bubble", 0.45f, 3f, 0.15f, 0.7f);
            Arc(t, "ArcA", 1.25f, A(0.4f, 0.04f, 0.45f, 1.1f, chroma: 0.006f, billboard: true, color: White));
            Arc(t, "ArcB", 1.15f, A(0.42f, 0.015f, 0.7f, -0.7f, billboard: true));
            Sprite(t, "Glow", "soft_glow", 1.8f, Ice, 0f);
            return root;
        }

        static GameObject BuildMagicCircle()
        {
            var root = ModuleRoot<MagicCircle>("MagicCircle");
            var t = root.transform;
            Ground(t, "Glow", "soft_glow", 9f, Deep, 0f, 0.01f);
            Ground(t, "Outer", "sigil_outer", 7f, Ice, 0f, 0.03f, reveal: 0f, edgeBoost: 4f, edgeWidth: 0.05f, noiseAmount: 0.06f, pulseSpeed: 1.5f, pulseAmount: 0.12f);
            Ground(t, "Taiji", "sigil_taiji", 3f, Ice, 0f, 0.04f, reveal: 0f, edgeBoost: 3f);
            Particles(t, "Mist", new PS
            {
                count = 64, lifeMin = 1.8f, lifeMax = 2.4f, speedMin = 0.2f, speedMax = 0.6f, sizeMin = 2f, sizeMax = 3.6f,
                shape = Shape.Ring, radius = 3.6f, innerRadius = 2.2f, randomRotation = true, angularVel = 20f, size = Grow(0.5f),
                color = FadeGradient(new Color(0.8f, 0.88f, 1f), 0.45f), flipbook = true, material = SmokeMat("Mist", 1.7f, "frost_cloud"),
                pos = new Vector3(0, 0.5f, 0),
            });
            Particles(t, "Streaks", new PS
            {
                count = 36, lifeMin = 0.6f, lifeMax = 0.75f, speedMin = 5f, speedMax = 9f, sizeMin = 0.1f, sizeMax = 0.16f,
                shape = Shape.ConeUp, coneAngle = 80f, radius = 0.5f, drag = 3f, stretch = true, lengthScale = 4f,
                color = SparkGradient(), material = Additive("MagicCircle_Streaks", Tex("soft_glow"), White, 6f, false),
                pos = new Vector3(0, 1.3f, 0),
            });
            Particles(t, "EdgeSparks", new PS
            {
                count = 70, lifeMin = 0.7f, lifeMax = 0.9f, sizeMin = 0.04f, sizeMax = 0.1f,
                shape = Shape.Ring, radius = 3.4f, innerRadius = 2.9f, upVelocity = 1.6f, size = Pop(), color = SparkGradient(),
                material = GlowDotMat("EdgeSparks", 5f),
            });
            return root;
        }

        static GameObject BuildChargeCore()
        {
            var root = ModuleRoot<ChargeCore>("ChargeCore");
            var t = root.transform;
            Orb(t, "Bubble", 1.1f, 3f, 0.12f, 0.35f);
            var dark = Mat("ChargeCore_Dark", "Unlit/Color", m => m.color = new Color(0.02f, 0.025f, 0.035f));
            MeshObj(t, "Dark", _sphere, dark, Vector3.zero, Vector3.zero, Vector3.zero);
            Sprite(t, "Glow", "soft_glow", 3.2f, Ice, 0f);
            var cr = Node(t, "Crescents").transform;
            for (int i = 0; i < 3; i++)
                Trail(cr, $"Crescent{i + 1}", "crescent", 0.8f + i * 0.25f, 0.9f, 1f, Vector3.zero,
                    new Vector3(-20f + i * 15f, i * 120f, 0f), Vector3.one * (3.4f + i * 0.4f), White);
            return root;
        }

        static GameObject BuildDetonation()
        {
            var root = ModuleRoot<Detonation>("Detonation");
            var t = root.transform;
            Ground(t, "FrostWave", "frost_ground", 16f, FrostC, 1.5f, 0.05f, reveal: 0f, edgeBoost: 3.5f, noiseAmount: 0.25f);
            Sprite(t, "Glow", "soft_glow", 9f, Ice, 0f, new Vector3(0, 1.3f, 0));
            Sprite(t, "Flash", "star_flare", 10f, White, 0f, new Vector3(0, 1.5f, 0));
            MeshObj(t, "Anamorphic", _quad, Additive("Detonation_Anamorphic", Tex("anamorphic_flare"), new Color(0.6f, 0.8f, 1f), 0f, true),
                new Vector3(0, 1.5f, 0), Vector3.zero, new Vector3(18f, 1.6f, 1f));
            var dome = MeshObj(t, "Dome", ModelMesh("shock_dome"), null, Vector3.zero, Vector3.zero, Vector3.one);
            dome.GetComponent<MeshRenderer>().sharedMaterial = Mat("Detonation_Dome", "IceUltimate/FresnelOrb", m =>
            {
                m.SetTexture("_NoiseTex", _noise);
                m.SetFloat("_Intensity", 0f);
                m.SetFloat("_RimPower", 2f);
                m.SetFloat("_CoreAmount", 0.05f);
                m.SetFloat("_Iridescence", 0.5f);
            });
            var loops = Node(t, "Loops", new Vector3(0, 1.6f, 0)).transform;
            for (int i = 0; i < 6; i++)
                Arc(loops, $"Loop{i + 1}", 3.2f, A(0.4f, 0.012f, 0.8f, 1.4f, i * 0.17f, 0.008f, color: White),
                    new Vector3(15f * (i % 3), i * 30f, 0f), new Vector3(Mathf.Cos(i * 1.05f) * 0.8f, 0.3f * (i % 2), Mathf.Sin(i * 1.05f) * 0.8f));
            Particles(t, "Explosion", new PS
            {
                oneShot = true, count = 8, lifeMin = 1.3f, lifeMax = 1.6f, speedMin = 1.5f, speedMax = 3.5f, sizeMin = 4.5f, sizeMax = 6.5f,
                shape = Shape.Sphere, radius = 0.9f, drag = 1.5f, randomRotation = true, color = FadeGradient(White, 1f), flipbook = true,
                material = Additive("Detonation_Explosion", Flip("explosion"), Ice, 0.9f, false, 0f, 1f), pos = new Vector3(0, 1.4f, 0),
            });
            Particles(t, "Debris", new PS
            {
                oneShot = true, count = 160, lifeMin = 1.2f, lifeMax = 1.6f, speedMin = 6f, speedMax = 16f, sizeMin = 0.08f, sizeMax = 0.2f,
                shape = Shape.Sphere, radius = 0.8f, gravity = 3f, drag = 3.5f, size = Pop(), color = SparkGradient(),
                material = GlowDotMat("Debris", 6f), pos = new Vector3(0, 1.2f, 0),
            });
            Particles(t, "Shards", new PS
            {
                oneShot = true, count = 40, lifeMin = 1.1f, lifeMax = 1.4f, speedMin = 5f, speedMax = 12f, sizeMin = 0.2f, sizeMax = 0.5f,
                shape = Shape.Sphere, radius = 0.2f, gravity = 9f, drag = 0.6f, randomRotation = true, angularVel = 360f,
                color = SparkGradient(), material = Additive("Detonation_Shards", Tex("ice_shard"), White, 3f, false), pos = new Vector3(0, 1f, 0),
            });
            Particles(t, "Streaks", new PS
            {
                oneShot = true, count = 110, lifeMin = 0.45f, lifeMax = 0.6f, speedMin = 10f, speedMax = 22f, sizeMin = 0.07f, sizeMax = 0.14f,
                shape = Shape.Sphere, radius = 0.5f, drag = 6f, stretch = true, lengthScale = 5f, color = SparkGradient(),
                material = Additive("Detonation_Streaks", Tex("soft_glow"), White, 7f, false), pos = new Vector3(0, 1.2f, 0),
            });
            Particles(t, "SmokeRing", new PS
            {
                oneShot = true, count = 34, lifeMin = 1.8f, lifeMax = 2.2f, speedMin = 4f, speedMax = 8f, sizeMin = 3f, sizeMax = 5f,
                shape = Shape.FlatRadial, radius = 0.6f, drag = 2f, randomRotation = true, size = Grow(), flipbook = true,
                color = FadeGradient(new Color(0.8f, 0.9f, 1f), 0.45f), material = SmokeMat("SmokeRing", 1.3f, "frost_cloud"),
                pos = new Vector3(0, 0.3f, 0),
            });
            return root;
        }

        static GameObject BuildCrystalEruption()
        {
            var root = ModuleRoot<CrystalEruption>("CrystalEruption");
            var t = root.transform;
            Ground(t, "Frost", "frost_ground", 9f, FrostC, 1f, 0.04f, reveal: 0f, edgeBoost: 1f);
            Ground(t, "Cracks", "ground_cracks", 12f, Ice, 1f, 0.05f, reveal: 0f, edgeBoost: 2f, noiseAmount: 0.2f);
            var crystalMat = CrystalMat("CrystalEruption_Crystals", 2f, 0.3f);
            foreach (var arms in new[] { false, true })
            {
                var go = Node(t, arms ? "Arms" : "Crystals");
                var cl = go.AddComponent<CrystalCluster>();
                cl.material = crystalMat;
                if (arms)
                {
                    cl.crystalMesh = ModelMesh("crystal_b");
                    cl.spikeCount = 0;
                    cl.armCount = 6;
                    cl.armWidth = 0.32f;
                }
                else
                {
                    cl.crystalMesh = ModelMesh("crystal_a");
                    cl.armCount = 0;
                    cl.widthRatio = 0.16f;
                }
                cl.Rebuild();
                cl.SetState(0f, 0f, 0f);
            }
            var sword = Node(t, "Sword").transform;
            MeshObj(sword, "Blade", ModelMesh("ice_sword"), CrystalMat("CrystalEruption_Blade", 1.6f, 0.6f), Vector3.zero, Vector3.zero, Vector3.one * 1.15f);
            var crescents = Node(sword, "Crescents").transform;
            for (int i = 0; i < 3; i++)
                Arc(crescents, $"Crescent{"ABC"[i]}", 1.3f - i * 0.15f, A(0.38f, 0.045f, 0.62f, 0f, 0.56f, billboard: true, color: White, tailFade: 0.2f),
                    Vector3.zero, new Vector3(0, 2f + i, 0));
            Particles(t, "Glints", new PS
            {
                count = 22, lifeMin = 0.4f, lifeMax = 0.5f, sizeMin = 0.3f, sizeMax = 0.7f, shape = Shape.Box, box = new Vector3(5.6f, 2.4f, 5.6f),
                randomRotation = true, size = new AnimationCurve(new Keyframe(0, 0), new Keyframe(0.3f, 1), new Keyframe(1, 0)),
                material = Additive("CrystalEruption_Glints", Tex("star_flare"), White, 3f, false), pos = new Vector3(0, 1f, 0),
            });
            Particles(t, "DissolveDust", new PS
            {
                count = 220, lifeMin = 1.2f, lifeMax = 1.6f, speedMin = 0.8f, speedMax = 3f, sizeMin = 0.04f, sizeMax = 0.1f,
                shape = Shape.Box, box = new Vector3(5.2f, 2f, 5.2f), size = Pop(), color = SparkGradient(),
                material = GlowDotMat("DissolveDust", 4f), pos = new Vector3(0, 0.8f, 0),
            });
            var light = Node(t, "Light", new Vector3(0, 2f, 0)).AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(0.6f, 0.8f, 1f);
            light.range = 10f;
            light.intensity = 0f;
            light.shadows = LightShadows.None;
            return root;
        }

        // ================================================================= master + animation
        static GameObject BuildMaster(Dictionary<string, GameObject> modules)
        {
            var root = new GameObject("IceUltimate");
            var ctrl = root.AddComponent<IceUltimateController>();
            ctrl.casterOffset = CasterOffset;

            void Place(string prefabName, string name, Vector3 pos)
            {
                var inst = (GameObject)PrefabUtility.InstantiatePrefab(modules[prefabName]);
                inst.name = name;
                inst.transform.SetParent(root.transform, false);
                inst.transform.localPosition = pos;
            }
            Place("TargetFlares", "TargetFlares", Vector3.zero);
            Place("MagicCircle", "MagicCircle", Vector3.zero);
            Place("CastFrost", "CastFrost", CasterOffset);
            Place("IceOrb", "IceOrb", Vector3.zero);
            Place("ImpactBurst", "ImpactBurst", new Vector3(0, 1.6f, 0));
            Place("RingOrb", "RingOrbA", new Vector3(0, 1.6f, 0));
            Place("RingOrb", "RingOrbB", new Vector3(0, 1.6f, 0));
            Place("ChargeCore", "ChargeCore", new Vector3(0, 1.7f, 0));
            Place("Detonation", "Detonation", Vector3.zero);
            Place("CrystalEruption", "CrystalEruption", Vector3.zero);
            root.GetComponentInChildren<IceOrb>().startPoint = CasterOffset + new Vector3(-0.3f, 1.5f, 0.4f);

            var clip = BuildCastClip();
            var controllerPath = $"{AnimDir}/IceUltimate.controller";
            AssetDatabase.DeleteAsset(controllerPath);
            var ac = AnimatorController.CreateAnimatorControllerAtPath(controllerPath);
            var sm = ac.layers[0].stateMachine;
            var idle = sm.AddState("Idle");
            var cast = sm.AddState("Cast");
            cast.motion = clip;
            sm.defaultState = idle;
            var animator = root.GetComponent<Animator>();
            animator.runtimeAnimatorController = ac;

            var prefab = PrefabUtility.SaveAsPrefabAsset(root, $"{PrefabDir}/IceUltimate.prefab");
            UnityEngine.Object.DestroyImmediate(root);
            return prefab;
        }

        // Easing nello stile di Godot: c > 1 ease-in, 0 < c < 1 ease-out, c < 0 in-out.
        const float Lin = 1f, EaseOut = 0.4f, EaseIn = 2.4f, EaseIO = -2f;

        static float Ease(float x, float c)
        {
            if (c > 0f) return c < 1f ? 1f - Mathf.Pow(1f - x, 1f / c) : Mathf.Pow(x, c);
            if (c < 0f)
                return x < 0.5f ? Mathf.Pow(x * 2f, -c) * 0.5f : (1f - Mathf.Pow(1f - (x - 0.5f) * 2f, -c)) * 0.5f + 0.5f;
            return 0f;
        }

        /// <summary>Curva da chiavi (tempo, valore, easing del segmento successivo).</summary>
        static AnimationCurve Curve(params (float t, float v, float ease)[] keys)
        {
            var curve = new AnimationCurve();
            for (int i = 0; i < keys.Length; i++)
            {
                curve.AddKey(new Keyframe(keys[i].t, keys[i].v));
                if (i + 1 < keys.Length && keys[i].ease != Lin)
                {
                    for (int s = 1; s < 6; s++)
                    {
                        float x = s / 6f;
                        float t = Mathf.Lerp(keys[i].t, keys[i + 1].t, x);
                        curve.AddKey(new Keyframe(t, Mathf.Lerp(keys[i].v, keys[i + 1].v, Ease(x, keys[i].ease))));
                    }
                }
            }
            for (int i = 0; i < curve.length; i++)
            {
                AnimationUtility.SetKeyLeftTangentMode(curve, i, AnimationUtility.TangentMode.Linear);
                AnimationUtility.SetKeyRightTangentMode(curve, i, AnimationUtility.TangentMode.Linear);
            }
            return curve;
        }

        static (float, float, float) K(float t, float v, float ease = Lin) => (t, v, ease);

        /// <summary>Curva a gradini per gli interruttori (0/1).</summary>
        static AnimationCurve Steps(params (float t, float v)[] keys)
        {
            var curve = new AnimationCurve(keys.Select(k => new Keyframe(k.t, k.v)).ToArray());
            for (int i = 0; i < curve.length; i++)
            {
                AnimationUtility.SetKeyLeftTangentMode(curve, i, AnimationUtility.TangentMode.Constant);
                AnimationUtility.SetKeyRightTangentMode(curve, i, AnimationUtility.TangentMode.Constant);
            }
            return curve;
        }

        static void Bind<T>(AnimationClip clip, string path, string field, AnimationCurve curve) =>
            AnimationUtility.SetEditorCurve(clip, EditorCurveBinding.FloatCurve(path, typeof(T), field), curve);

        static void BindPosition(AnimationClip clip, string path, params (float t, Vector3 p, float ease)[] keys)
        {
            Bind<Transform>(clip, path, "m_LocalPosition.x", Curve(keys.Select(k => K(k.t, k.p.x, k.ease)).ToArray()));
            Bind<Transform>(clip, path, "m_LocalPosition.y", Curve(keys.Select(k => K(k.t, k.p.y, k.ease)).ToArray()));
            Bind<Transform>(clip, path, "m_LocalPosition.z", Curve(keys.Select(k => K(k.t, k.p.z, k.ease)).ToArray()));
        }

        /// <summary>Coreografia completa (tempi presi dal video di riferimento, 10 s).</summary>
        static AnimationClip BuildCastClip()
        {
            var path = $"{AnimDir}/IceUltimate_Cast.anim";
            AssetDatabase.DeleteAsset(path);
            var clip = new AnimationClip { name = "IceUltimate_Cast", frameRate = 60f };

            // 0.0 lock-on sui bersagli
            Bind<TargetFlares>(clip, "TargetFlares", "flash", Curve(K(0f, 0f), K(0.06f, 1.6f, EaseOut), K(0.5f, 0f)));
            // 0.0-1.6 caster: esplosione di gelo; 5.2-7.4 ricarica
            Bind<CastFrost>(clip, "CastFrost", "flash", Curve(K(0f, 0f), K(0.1f, 1.6f, EaseOut), K(0.5f, 1f), K(1.1f, 0.3f), K(1.7f, 0f), K(5.25f, 0f), K(5.4f, 1.2f, EaseOut), K(6f, 0.4f), K(6.9f, 1f), K(7.3f, 0f)));
            Bind<CastFrost>(clip, "CastFrost", "frost", Curve(K(0f, 0f, EaseOut), K(0.5f, 1f), K(5.2f, 1f), K(5.21f, 0f, EaseOut), K(5.7f, 1f)));
            Bind<CastFrost>(clip, "CastFrost", "fade", Curve(K(0f, 1f), K(1.6f, 1f), K(2.6f, 0f), K(5.21f, 0f), K(5.25f, 1f), K(7.4f, 1f), K(8.4f, 0f)));
            Bind<CastFrost>(clip, "CastFrost", "mist", Steps((0f, 1f), (1.4f, 0f), (5.2f, 1f), (7.6f, 0f)));
            // 0.35-1.7 sfera in volo, 1.7-2.5 sospesa, 2.52 impatto
            Bind<IceOrb>(clip, "IceOrb", "intensity", Curve(K(0f, 0f), K(0.2f, 0f, EaseOut), K(0.4f, 1.6f), K(2.35f, 2.2f), K(2.55f, 0f)));
            Bind<IceOrb>(clip, "IceOrb", "progress", Curve(K(0f, 0f), K(0.35f, 0f, EaseIO), K(1.7f, 1f)));
            Bind<ImpactBurst>(clip, "ImpactBurst", "flash", Curve(K(0f, 0f), K(2.5f, 0f, EaseOut), K(2.56f, 2f), K(2.9f, 0.3f), K(3.3f, 0f)));
            Bind<ImpactBurst>(clip, "ImpactBurst", "rings", Curve(K(0f, 0f), K(2.52f, 0f, EaseOut), K(3.3f, 1f)));
            // 2.6-3.95 satelliti che si aprono e rientrano
            foreach (var (name, side) in new[] { ("RingOrbA", -1f), ("RingOrbB", 1f) })
            {
                Bind<RingOrb>(clip, name, "intensity", Curve(K(0f, 0f), K(2.6f, 0f), K(2.8f, 1.3f), K(3.7f, 1.3f), K(3.95f, 0f)));
                var home = new Vector3(0, 1.6f, 0);
                BindPosition(clip, name, (0f, home, Lin), (2.6f, home, EaseOut),
                    (3.05f, new Vector3(2.7f * side, side < 0 ? 1.1f : 1.3f, 0.5f * side), Lin),
                    (3.6f, new Vector3(2.4f * side, side < 0 ? 1f : 1.2f, 0.8f * side), EaseIn), (3.95f, home, Lin));
            }
            // 2.8-7.0 sigillo
            Bind<MagicCircle>(clip, "MagicCircle", "reveal", Curve(K(0f, 0f), K(2.8f, 0f, EaseOut), K(3.6f, 1f)));
            Bind<MagicCircle>(clip, "MagicCircle", "intensity", Curve(K(0f, 0f), K(2.75f, 0f), K(2.85f, 1f), K(4f, 1.2f), K(6.8f, 1.5f), K(7f, 2.5f), K(7.25f, 0f)));
            Bind<MagicCircle>(clip, "MagicCircle", "spinSpeed", Curve(K(0f, 1.2f), K(2.8f, 1.2f, EaseOut), K(3.6f, 0.35f), K(6.4f, 0.6f, EaseIn), K(6.95f, 2.2f)));
            Bind<MagicCircle>(clip, "MagicCircle", "mist", Steps((0f, 0f), (2.9f, 1f), (7f, 0f)));
            Bind<MagicCircle>(clip, "MagicCircle", "streaks", Steps((0f, 0f), (3.9f, 1f), (6.95f, 0f)));
            // 3.6-6.9 nucleo di carica
            Bind<ChargeCore>(clip, "ChargeCore", "intensity", Curve(K(0f, 0f), K(3.6f, 0f), K(3.9f, 1f), K(6.6f, 1.6f), K(6.85f, 2.5f), K(6.92f, 0f)));
            Bind<ChargeCore>(clip, "ChargeCore", "charge", Curve(K(0f, 0f), K(3.6f, 0f, EaseIn), K(6.8f, 1f)));
            // 6.87 detonazione
            Bind<Detonation>(clip, "Detonation", "flash", Curve(K(0f, 0f), K(6.85f, 0f), K(6.9f, 2f), K(7.1f, 0.8f), K(7.6f, 0f)));
            Bind<Detonation>(clip, "Detonation", "progress", Curve(K(0f, 0f), K(6.87f, 0f, EaseOut), K(7.8f, 1f)));
            Bind<Detonation>(clip, "Detonation", "fade", Curve(K(0f, 1f), K(7.25f, 1f), K(8.1f, 0f)));
            // 6.9-9.5 cristalli, spada, dissoluzione
            Bind<CrystalEruption>(clip, "CrystalEruption", "grow", Curve(K(0f, 0f), K(6.9f, 0f, EaseOut), K(7.35f, 1f)));
            Bind<CrystalEruption>(clip, "CrystalEruption", "sword", Curve(K(0f, 0f), K(6.9f, 0f, EaseIn), K(7.1f, 1f)));
            Bind<CrystalEruption>(clip, "CrystalEruption", "cracks", Curve(K(0f, 0f), K(6.9f, 0f, EaseOut), K(7.5f, 1f)));
            Bind<CrystalEruption>(clip, "CrystalEruption", "glow", Curve(K(0f, 0f), K(6.9f, 3f, EaseOut), K(7.6f, 0.15f)));
            Bind<CrystalEruption>(clip, "CrystalEruption", "dissolve", Curve(K(0f, 0f), K(8.3f, 0f, EaseIn), K(9.5f, 1f), K(10f, 1f)));

            AnimationUtility.SetAnimationEvents(clip, new[]
            {
                Evt(0.02f, "EvtBurst", "CastFrost"),
                Evt(0.02f, "EvtShake", "0.25,0.3"),
                Evt(2.52f, "EvtBurst", "ImpactBurst"),
                Evt(2.52f, "EvtShake", "0.6,0.5"),
                Evt(2.52f, "EvtPunch", "4,0.5"),
                Evt(2.52f, "EvtPost", "1.2,0.4,0.35,0.6"),
                Evt(2.52f, "EvtSignal", "impact"),
                Evt(5.22f, "EvtBurst", "CastFrost"),
                Evt(6.88f, "EvtBurst", "Detonation"),
                Evt(6.88f, "EvtShake", "1.2,0.9"),
                Evt(6.88f, "EvtPunch", "14,1.1"),
                Evt(6.88f, "EvtPost", "2.2,1.0,1.1,0.9"),
                Evt(6.88f, "EvtSignal", "detonated"),
                Evt(7.1f, "EvtShake", "0.45,0.35"),
                Evt(9.98f, "EvtSignal", "finished"),
            });
            var settings = AnimationUtility.GetAnimationClipSettings(clip);
            settings.loopTime = false;
            settings.stopTime = 10f;
            AnimationUtility.SetAnimationClipSettings(clip, settings);
            AssetDatabase.CreateAsset(clip, path);
            return clip;
        }

        static AnimationEvent Evt(float time, string fn, string arg) =>
            new AnimationEvent { time = time, functionName = fn, stringParameter = arg };

        // ================================================================= demo scene
        [MenuItem("Tools/Ice Ultimate/Build Demo Scene Only", priority = 2)]
        static void BuildDemoSceneMenu()
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"{PrefabDir}/IceUltimate.prefab");
            if (!prefab) prefab = BuildPrefab();
            BuildDemoScene(prefab);
        }

        static Material LitMat(string name, Color color, Texture tex = null, Vector2? tiling = null, float smoothness = 0.4f)
        {
            bool urp = GraphicsSettings.currentRenderPipeline != null;
            var shaderName = urp ? "Universal Render Pipeline/Lit" : "Standard";
            return Mat(name, shaderName, m =>
            {
                m.color = color;
                if (tex) m.mainTexture = tex;
                if (tiling.HasValue) m.mainTextureScale = tiling.Value;
                if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smoothness);
                if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", smoothness);
                if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", 0.15f);
            });
        }

        static AnimatorController CharacterController()
        {
            var path = $"{AnimDir}/Caster.controller";
            AssetDatabase.DeleteAsset(path);
            var clips = AssetDatabase.LoadAllAssetsAtPath($"{Root}/Art/Models/caster.fbx").OfType<AnimationClip>()
                .Where(c => !c.name.StartsWith("__preview__")).ToArray();
            var idleClip = clips.FirstOrDefault(c => c.name.ToLowerInvariant().Contains("idle"));
            // attenzione: anche "Caster|idle" contiene "cast"
            var castClip = clips.FirstOrDefault(c => c.name.ToLowerInvariant().Contains("cast") && !c.name.ToLowerInvariant().Contains("idle"));
            var ac = AnimatorController.CreateAnimatorControllerAtPath(path);
            var sm = ac.layers[0].stateMachine;
            var idle = sm.AddState("Idle");
            idle.motion = idleClip;
            var cast = sm.AddState("Cast");
            cast.motion = castClip;
            sm.defaultState = idle;
            var back = cast.AddTransition(idle);
            back.hasExitTime = true;
            back.exitTime = 0.98f;
            back.duration = 0.2f;
            return ac;
        }

        static Animator SpawnCharacter(string name, Vector3 pos, Vector3 lookAt, AnimatorController ac, Material mat)
        {
            var model = AssetDatabase.LoadAssetAtPath<GameObject>($"{Root}/Art/Models/caster.fbx");
            var go = (GameObject)PrefabUtility.InstantiatePrefab(model);
            go.name = name;
            go.transform.position = pos;
            var dir = lookAt - pos;
            dir.y = 0f;
            go.transform.rotation = Quaternion.LookRotation(dir.normalized, Vector3.up);
            foreach (var r in go.GetComponentsInChildren<Renderer>()) r.sharedMaterial = mat;
            var anim = go.GetComponent<Animator>();
            if (!anim) anim = go.AddComponent<Animator>();
            anim.runtimeAnimatorController = ac;
            return anim;
        }

        public static void BuildDemoScene(GameObject prefab)
        {
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.22f, 0.24f, 0.28f);
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Exponential;
            RenderSettings.fogDensity = 0.03f;
            RenderSettings.fogColor = new Color(0.13f, 0.14f, 0.17f);
            RenderSettings.skybox = null;

            var camGo = new GameObject("Main Camera") { tag = "MainCamera" };
            var cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.03f, 0.035f, 0.045f);
            cam.fieldOfView = 40f;
            cam.allowHDR = true;
            cam.nearClipPlane = 0.1f;
            cam.farClipPlane = 200f;
            cam.depthTextureMode = DepthTextureMode.Depth;
            camGo.transform.position = new Vector3(2.4f, 8.6f, -12.6f);
            camGo.transform.LookAt(new Vector3(0.5f, 0.2f, -1.4f));
            camGo.AddComponent<CameraShake>();
            var post = camGo.AddComponent<IcePostFX>();

            var sun = new GameObject("Sun").AddComponent<Light>();
            sun.type = LightType.Directional;
            sun.intensity = 0.6f;
            sun.color = new Color(0.75f, 0.82f, 1f);
            sun.shadows = LightShadows.Soft;
            sun.transform.rotation = Quaternion.Euler(55f, -35f, 0f);

            var floor = GameObject.CreatePrimitive(PrimitiveType.Plane);
            floor.name = "Floor";
            floor.transform.localScale = new Vector3(8f, 1f, 8f);
            floor.GetComponent<Renderer>().sharedMaterial = LitMat("Demo_Floor", Color.white, Tex("floor_checker"), new Vector2(20f, 20f), 0.45f);

            var charMat = LitMat("Demo_Character", new Color(0.035f, 0.04f, 0.05f), null, null, 0.55f);
            var ac = CharacterController();
            var caster = SpawnCharacter("Caster", CasterOffset, Vector3.zero, ac, charMat);
            var enemies = new GameObject("Enemies").transform;
            for (int i = 0; i < EnemyPositions.Length; i++)
                SpawnCharacter($"Enemy{i + 1}", EnemyPositions[i], CasterOffset, ac, charMat).transform.SetParent(enemies, true);

            var ult = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            var ctrl = ult.GetComponent<IceUltimateController>();
            ctrl.casterAnimator = caster;
            ctrl.playOnEnable = false;

            var demo = new GameObject("Demo").AddComponent<IceUltimateDemo>();
            demo.ultimate = ctrl;

#if ICE_URP
            SetupUrpPost(cam, post);
#else
            Debug.Log("[Ice Ultimate] Senza URP: aggiungi Bloom (es. Post Processing Stack v2) per il look del video.");
#endif
            EditorSceneManager.SaveScene(scene, $"{Gen}/Scenes/IceUltimate_Demo.unity");
            Debug.Log("[Ice Ultimate] Scena demo salvata in " + scene.path);
        }

#if ICE_URP
        static VolumeProfile Profile(string name)
        {
            var path = $"{Gen}/Scenes/{name}.asset";
            AssetDatabase.DeleteAsset(path);
            var profile = ScriptableObject.CreateInstance<VolumeProfile>();
            AssetDatabase.CreateAsset(profile, path);
            return profile;
        }

        static T AddOverride<T>(VolumeProfile profile) where T : VolumeComponent
        {
            var c = profile.Add<T>(true);
            c.name = typeof(T).Name;
            AssetDatabase.AddObjectToAsset(c, profile);
            return c;
        }

        static void SetupUrpPost(Camera cam, IcePostFX post)
        {
            var data = cam.GetUniversalAdditionalCameraData();
            data.renderPostProcessing = true;
            data.requiresDepthTexture = true;

            // look di base: bloom forte, ACES, vignettatura, un filo di aberrazione
            var baseProfile = Profile("IceUltimate_PostBase");
            var bloom = AddOverride<Bloom>(baseProfile);
            bloom.intensity.Override(1.3f);
            bloom.threshold.Override(0.9f);
            bloom.scatter.Override(0.72f);
            AddOverride<Tonemapping>(baseProfile).mode.Override(TonemappingMode.ACES);
            AddOverride<Vignette>(baseProfile).intensity.Override(0.38f);
            AddOverride<ChromaticAberration>(baseProfile).intensity.Override(0.12f);

            // volume d'impatto: il peso viene animato da IcePostFX (0 a riposo)
            var impactProfile = Profile("IceUltimate_PostImpact");
            AddOverride<ChromaticAberration>(impactProfile).intensity.Override(1f);
            AddOverride<LensDistortion>(impactProfile).intensity.Override(-0.35f);
            var impactBloom = AddOverride<Bloom>(impactProfile);
            impactBloom.intensity.Override(3.5f);
            impactBloom.threshold.Override(0.7f);
            AssetDatabase.SaveAssets();

            var baseVol = new GameObject("PostFX_Base").AddComponent<Volume>();
            baseVol.isGlobal = true;
            baseVol.priority = 0;
            baseVol.sharedProfile = baseProfile;
            var impactVol = new GameObject("PostFX_Impact").AddComponent<Volume>();
            impactVol.isGlobal = true;
            impactVol.priority = 1;
            impactVol.weight = 0f;
            impactVol.sharedProfile = impactProfile;
            post.impactVolume = impactVol.gameObject;
        }
#endif
    }
}
