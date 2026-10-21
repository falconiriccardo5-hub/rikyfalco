using UnityEngine;

namespace IceUltimate
{
    /// <summary>Fase 3: impatto della sfera (flash, anelli, esplosione volumetrica, fumo).</summary>
    public class ImpactBurst : IceVfxModule
    {
        [Range(0, 2)] public float flash;
        [Range(0, 1)] public float rings;

        public override void Apply()
        {
            SetFloat("Flash", IdIntensity, flash * 2f);
            SetFloat("Glow", IdIntensity, flash * 0.7f);
            var r = transform.Find("Rings");
            if (r)
            {
                r.localScale = Vector3.one * Mathf.Lerp(0.4f, 3.2f, rings);
                SetGroupFloat("Rings", IdIntensity, rings > 0.001f && rings < 0.999f ? (1f - rings) * 6f : 0f);
            }
        }
    }
}
