using UnityEngine;

namespace IceUltimate
{
    /// <summary>Fase 7-8: cristalli, spada che cala, crepe, luccichii, dissoluzione in polvere.</summary>
    public class CrystalEruption : IceVfxModule
    {
        [Range(0, 1.5f)] public float grow;
        [Tooltip("0 = spada in alto, 1 = conficcata a terra")] [Range(0, 1)] public float sword;
        [Range(0, 1.2f)] public float cracks;
        [Range(0, 1)] public float dissolve;
        [Range(0, 10)] public float glow;
        public float swordDropHeight = 9f;

        public override void Apply()
        {
            foreach (var cl in GetComponentsInChildren<CrystalCluster>(true))
                cl.SetState(grow, dissolve, glow);
            var s = transform.Find("Sword");
            if (s)
            {
                s.localPosition = new Vector3(0f, Mathf.Lerp(swordDropHeight, 0f, sword), 0f);
                s.localScale = Vector3.one * (sword > 0.001f ? 1f : 0f);
            }
            SetFloat("Sword/Blade", IdDissolve, dissolve);
            SetFloat("Sword/Blade", IdFlash, glow * 0.5f);
            SetGroupFloat("Sword/Crescents", IdIntensity, 3f * sword * (1f - dissolve));
            SetFloat("Cracks", IdReveal, cracks);
            SetFloat("Cracks", IdFade, 1f - dissolve);
            SetFloat("Frost", IdReveal, cracks * 0.9f);
            SetFloat("Frost", IdFade, 0.35f * (1f - dissolve));
            SetEmitting("Glints", grow > 0.5f && dissolve < 0.2f);
            SetEmitting("DissolveDust", dissolve > 0.02f && dissolve < 0.9f);
            var lt = transform.Find("Light");
            if (lt && lt.TryGetComponent<Light>(out var light))
                light.intensity = (0.5f + glow * 0.8f) * Mathf.Min(grow, 1f) * (1f - dissolve);
        }
    }
}
