using UnityEngine;

namespace IceUltimate
{
    /// <summary>Fase 4-5: sigillo a terra (zodiaco + taiji), nebbia, scie a ventaglio.</summary>
    public class MagicCircle : IceVfxModule
    {
        [Range(0, 1.2f)] public float reveal;
        [Range(0, 3)] public float intensity;
        [Tooltip("Rotazione dell'anello esterno (rad/s); il taiji gira al contrario")] public float spinSpeed = 0.35f;
        [Range(0, 1)] public float mist;
        [Range(0, 1)] public float streaks;

        public override void Apply()
        {
            SetFloat("Outer", IdReveal, reveal);
            SetFloat("Outer", IdIntensity, intensity * 2.2f);
            SetFloat("Outer", IdSpinSpeed, spinSpeed);
            SetFloat("Taiji", IdReveal, Mathf.Clamp(reveal * 1.4f - 0.2f, 0f, 1.2f));
            SetFloat("Taiji", IdIntensity, intensity * 1.3f);
            SetFloat("Taiji", IdSpinSpeed, -spinSpeed * 1.6f);
            SetFloat("Glow", IdIntensity, intensity * 0.35f * Mathf.Min(reveal, 1f));
            SetEmitting("Mist", mist > 0.5f);
            SetEmitting("Streaks", streaks > 0.5f);
            SetEmitting("EdgeSparks", streaks > 0.5f);
        }
    }
}
