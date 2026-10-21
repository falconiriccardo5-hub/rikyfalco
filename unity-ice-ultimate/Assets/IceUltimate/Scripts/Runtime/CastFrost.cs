using UnityEngine;

namespace IceUltimate
{
    /// <summary>Fase 1 (caster): fiocco di neve, brina "elettrica" a terra, vortici e scintille.</summary>
    public class CastFrost : IceVfxModule
    {
        [Range(0, 1.2f)] public float frost;
        [Range(0, 1)] public float fade = 1f;
        [Range(0, 2)] public float flash;
        [Tooltip("> 0.5 = nebbia e polvere attive")] [Range(0, 1)] public float mist;

        public override void Apply()
        {
            SetFloat("FrostDecal", IdReveal, frost);
            SetFloat("FrostDecal", IdFade, fade);
            SetFloat("Cracks", IdReveal, frost * 0.95f);
            SetFloat("Cracks", IdFade, fade);
            SetFloat("Snowflake", IdIntensity, flash * 2f);
            SetFloat("Glow", IdIntensity, flash * 0.7f);
            SetGroupFloat("Swirl", IdIntensity, flash * 4.5f);
            var s = transform.Find("Snowflake");
            if (s) s.localScale = Vector3.one * (0.5f + flash * 0.6f) * 1.3f;
            SetEmitting("Mist", mist > 0.5f);
            SetEmitting("Dust", mist > 0.5f);
        }
    }
}
