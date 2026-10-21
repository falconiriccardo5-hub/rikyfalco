using UnityEngine;

namespace IceUltimate
{
    /// <summary>Satellite: bolla con anelli luminosi (fase 4).</summary>
    public class RingOrb : IceVfxModule
    {
        [Range(0, 3)] public float intensity;

        public override void Apply()
        {
            SetFloat("Bubble", IdIntensity, intensity * 1.2f);
            SetFloat("ArcA", IdIntensity, intensity * 5f);
            SetFloat("ArcB", IdIntensity, intensity * 3f);
            SetFloat("Glow", IdIntensity, intensity * 0.8f);
        }
    }
}
