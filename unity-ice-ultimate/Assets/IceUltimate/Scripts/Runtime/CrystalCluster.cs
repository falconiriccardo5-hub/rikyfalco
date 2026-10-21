using System.Collections.Generic;
using UnityEngine;

namespace IceUltimate
{
    /// <summary>
    /// Cluster procedurale di cristalli: crea uno spuntone (figlio con MeshRenderer)
    /// per ogni cristallo, con un ritardo di crescita individuale. Modifica i
    /// parametri e usa il menu contestuale "Rebuild" (tasto destro sul componente).
    /// La crescita (con overshoot) e' applicata alla scala di ogni spuntone.
    /// </summary>
    [ExecuteAlways]
    public class CrystalCluster : MonoBehaviour
    {
        public Mesh crystalMesh;
        public Material material;
        public int seed = 7;

        [Header("Spuntoni centrali")]
        public int spikeCount = 110;
        public float baseRadius = 1.3f;
        public float lengthMin = 0.8f;
        public float lengthMax = 3.8f;
        [Range(0, 90)] public float tiltMinDeg = 8f;
        [Range(0, 90)] public float tiltMaxDeg = 70f;
        public float widthRatio = 0.16f;

        [Header("Bracci a fiocco di neve")]
        public int armCount;
        public float armLength = 4.2f;
        public float armWidth = 0.32f;
        public int armSideSpikes = 3;

        [Header("Crescita")]
        [Range(0, 0.9f)] public float delaySpread = 0.45f;

        [SerializeField, HideInInspector] List<Transform> _spikes = new List<Transform>();
        [SerializeField, HideInInspector] List<Vector3> _baseScales = new List<Vector3>();
        [SerializeField, HideInInspector] List<float> _delays = new List<float>();

        static readonly int IdDissolve = Shader.PropertyToID("_Dissolve");
        static readonly int IdFlash = Shader.PropertyToID("_Flash");
        MaterialPropertyBlock _mpb;

        [ContextMenu("Rebuild")]
        public void Rebuild()
        {
            for (int i = transform.childCount - 1; i >= 0; i--)
            {
                var c = transform.GetChild(i).gameObject;
                if (Application.isPlaying) Destroy(c); else DestroyImmediate(c);
            }
            _spikes.Clear();
            _baseScales.Clear();
            _delays.Clear();
            var rng = new System.Random(seed);
            float Rand() => (float)rng.NextDouble();
            float Range(float a, float b) => a + (b - a) * Rand();

            // bracci orizzontali disposti a fiocco di neve
            for (int k = 0; k < armCount; k++)
            {
                float az = Mathf.PI * 2f * k / armCount + Range(-0.12f, 0.12f);
                var dir = new Vector3(Mathf.Cos(az), 0f, Mathf.Sin(az));
                var armDir = (dir + Vector3.up * 0.12f).normalized;
                float armLen = armLength * Range(0.8f, 1.1f);
                AddSpike(dir * 0.2f, armDir, armLen, armWidth, Range(0f, 0.15f));
                for (int s = 0; s < armSideSpikes; s++)
                {
                    float t = Range(0.3f, 0.85f);
                    float side = s % 2 == 0 ? 1f : -1f;
                    var perp = Vector3.Cross(dir, Vector3.up) * side;
                    var sdir = (dir * 0.8f + perp * 0.9f + Vector3.up * 0.35f).normalized;
                    AddSpike(dir * armLen * t, sdir, armLen * Range(0.15f, 0.3f), armWidth * 0.6f, 0.2f + t * 0.4f);
                }
            }
            // spuntoni centrali verso l'alto e l'esterno
            for (int i = 0; i < spikeCount; i++)
            {
                float r = baseRadius * Mathf.Sqrt(Rand());
                float az = Rand() * Mathf.PI * 2f;
                var basePos = new Vector3(Mathf.Cos(az) * r, 0f, Mathf.Sin(az) * r);
                float rn = r / Mathf.Max(baseRadius, 0.001f);
                float tilt = Mathf.Deg2Rad * (Mathf.Lerp(tiltMinDeg, tiltMaxDeg, rn) + Range(-10f, 10f));
                float outAz = az + Range(-0.4f, 0.4f);
                var dir = new Vector3(Mathf.Cos(outAz) * Mathf.Sin(tilt), Mathf.Cos(tilt), Mathf.Sin(outAz) * Mathf.Sin(tilt));
                float length = Mathf.Lerp(lengthMax, lengthMin, rn) * Range(0.6f, 1.15f);
                AddSpike(basePos, dir, length, length * widthRatio, Mathf.Clamp01(rn * 0.55f + Rand() * 0.45f));
            }
        }

        void AddSpike(Vector3 origin, Vector3 dir, float length, float width, float delay)
        {
            var go = new GameObject("Spike" + _spikes.Count);
            go.transform.SetParent(transform, false);
            go.transform.localPosition = origin;
            go.transform.localRotation = Quaternion.FromToRotation(Vector3.up, dir.normalized);
            go.AddComponent<MeshFilter>().sharedMesh = crystalMesh;
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterial = material;
            mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            _spikes.Add(go.transform);
            _baseScales.Add(new Vector3(width, length, width));
            _delays.Add(delay);
            go.transform.localScale = Vector3.zero;
        }

        /// <summary>Chiamato da CrystalEruption: crescita, dissoluzione, flash.</summary>
        public void SetState(float grow, float dissolve, float flash)
        {
            if (_mpb == null) _mpb = new MaterialPropertyBlock();
            for (int i = 0; i < _spikes.Count; i++)
            {
                var t = _spikes[i];
                if (!t) continue;
                float delay = _delays[i] * delaySpread;
                float g = Mathf.Clamp((grow - delay) / Mathf.Max(1f - delaySpread, 0.05f), 0f, 1.6f);
                float s = BackOut(Mathf.Clamp01(g)) * Mathf.Max(g, 1f);
                var b = _baseScales[i];
                float w = Mathf.Lerp(0.4f, 1f, Mathf.Clamp01(s));
                t.localScale = new Vector3(b.x * w, b.y * s, b.z * w);
                var r = t.GetComponent<Renderer>();
                r.GetPropertyBlock(_mpb);
                _mpb.SetFloat(IdDissolve, dissolve);
                _mpb.SetFloat(IdFlash, flash);
                r.SetPropertyBlock(_mpb);
            }
        }

        /// <summary>Easing con overshoot (back-out): lo spuntone "scatta" oltre e torna.</summary>
        static float BackOut(float x)
        {
            const float c1 = 1.70158f;
            float u = x - 1f;
            return 1f + (c1 + 1f) * u * u * u + c1 * u * u;
        }
    }
}
