using UnityEngine;

namespace IceUltimate
{
    /// <summary>Fase 2: sfera di ghiaccio che vola dal caster al bersaglio lungo una Bezier.</summary>
    public class IceOrb : IceVfxModule
    {
        public Vector3 startPoint = new Vector3(2.3f, 1.5f, -4.6f);
        public Vector3 endPoint = new Vector3(0f, 1.6f, 0f);
        [Tooltip("Altezza del punto di controllo della curva")] public float arcHeight = 1.6f;
        [Range(0, 1)] public float progress;
        [Range(0, 3)] public float intensity;
        public float tumbleSpeed = 230f;

        public override void Apply()
        {
            var mid = (startPoint + endPoint) * 0.5f + Vector3.up * arcHeight;
            float t = progress;
            transform.localPosition = Vector3.Lerp(Vector3.Lerp(startPoint, mid, t), Vector3.Lerp(mid, endPoint, t), t);
            SetFloat("Core", IdIntensity, intensity * 0.6f);
            SetFloat("Glow", IdIntensity, intensity * 0.25f);
            SetFloat("Snowflake", IdIntensity, intensity * 1.4f);
            SetGroupFloat("Arcs", IdIntensity, intensity * 3f);
            SetEmitting("Trail", intensity > 0.2f);
            SetEmitting("MistTrail", intensity > 0.2f);
        }

        void Update()
        {
            if (!Application.isPlaying || intensity <= 0f) return;
            var arcs = transform.Find("Arcs");
            if (arcs) arcs.Rotate(new Vector3(0.4f, 1f, 0.2f).normalized, tumbleSpeed * Time.deltaTime, Space.Self);
        }
    }
}
