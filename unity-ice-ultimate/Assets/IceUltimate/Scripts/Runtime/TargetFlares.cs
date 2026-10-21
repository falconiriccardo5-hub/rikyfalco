using UnityEngine;

namespace IceUltimate
{
    /// <summary>Lampi rossi anamorfici sui bersagli all'inizio del cast (lock-on).</summary>
    public class TargetFlares : IceVfxModule
    {
        [Range(0, 2)] public float flash;

        public override void Apply()
        {
            foreach (Transform target in transform)
                foreach (Transform c in target)
                {
                    var r = c.GetComponent<Renderer>();
                    if (r) SetFloat(r, IdIntensity, flash * 3f);
                }
        }
    }
}
