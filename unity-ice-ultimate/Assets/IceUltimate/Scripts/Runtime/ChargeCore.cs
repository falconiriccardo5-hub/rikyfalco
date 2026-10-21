using UnityEngine;

namespace IceUltimate
{
    /// <summary>Fase 5: bolla di carica con nucleo scuro e mezzelune rotanti.</summary>
    public class ChargeCore : IceVfxModule
    {
        [Range(0, 1)] public float charge;
        [Range(0, 3)] public float intensity;
        public float crescentSpeed = 80f;

        public override void Apply()
        {
            var b = transform.Find("Bubble");
            if (b) b.localScale = Vector3.one * 2.2f * Mathf.Lerp(0.25f, 1f, charge);
            var d = transform.Find("Dark");
            if (d)
            {
                // a intensita' zero il nucleo scuro sparisce (scala 0)
                d.localScale = Vector3.one * (intensity > 0.001f ? 0.64f * Mathf.Lerp(0.2f, 1f, charge) : 0f);
            }
            var c = transform.Find("Crescents");
            if (c) c.localScale = Vector3.one * Mathf.Lerp(0.5f, 1f, charge);
            SetGroupFloat("Crescents", IdIntensity, intensity * 6f);
            SetFloat("Bubble", IdIntensity, intensity * (0.4f + charge * 0.6f));
            SetFloat("Glow", IdIntensity, intensity * charge * 0.5f);
        }

        void Update()
        {
            if (!Application.isPlaying || intensity <= 0f) return;
            var c = transform.Find("Crescents");
            if (c) c.Rotate(Vector3.up, crescentSpeed * Time.deltaTime, Space.Self);
        }
    }
}
