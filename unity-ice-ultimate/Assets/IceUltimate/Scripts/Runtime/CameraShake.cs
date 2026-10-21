using System.Collections.Generic;
using UnityEngine;

namespace IceUltimate
{
    /// <summary>Camera shake a "trauma" con rumore di Perlin + zoom d'impatto (FOV).</summary>
    [RequireComponent(typeof(Camera))]
    public class CameraShake : MonoBehaviour
    {
        public Vector3 maxOffset = new Vector3(0.35f, 0.3f, 0.2f);
        public float maxRollDeg = 2f;
        public float frequency = 22f;

        static readonly List<CameraShake> All = new List<CameraShake>();

        Camera _cam;
        Vector3 _basePos;
        Quaternion _baseRot;
        float _baseFov;
        float _trauma, _decay = 1.5f, _t;
        float _punch, _punchTime, _punchDuration;

        public static void ShakeAll(float amount, float duration) { foreach (var s in All) s.AddShake(amount, duration); }
        public static void PunchAll(float fovDegrees, float duration) { foreach (var s in All) s.Punch(fovDegrees, duration); }

        void OnEnable()
        {
            _cam = GetComponent<Camera>();
            _basePos = transform.localPosition;
            _baseRot = transform.localRotation;
            _baseFov = _cam.fieldOfView;
            All.Add(this);
        }

        void OnDisable()
        {
            All.Remove(this);
            transform.localPosition = _basePos;
            transform.localRotation = _baseRot;
            if (_cam) _cam.fieldOfView = _baseFov;
        }

        public void AddShake(float amount, float duration)
        {
            _trauma = Mathf.Clamp(Mathf.Max(_trauma, amount), 0f, 1.5f);
            _decay = _trauma / Mathf.Max(duration, 0.05f);
        }

        /// <summary>Stringe il FOV di colpo e lo riapre con easing.</summary>
        public void Punch(float fovDegrees, float duration)
        {
            _punch = fovDegrees;
            _punchTime = 0f;
            _punchDuration = Mathf.Max(duration, 0.05f);
        }

        void LateUpdate()
        {
            float dt = Time.deltaTime;
            _t += dt * frequency;
            _trauma = Mathf.Max(_trauma - _decay * dt, 0f);
            float k = _trauma * _trauma;
            var off = new Vector3(Noise(_t, 0f), Noise(0f, _t), Noise(_t, _t));
            off.Scale(maxOffset * k);
            float roll = maxRollDeg * k * Noise(_t * 0.7f, 99f);
            transform.localPosition = _basePos + _baseRot * off;
            transform.localRotation = _baseRot * Quaternion.Euler(0f, 0f, roll);

            if (_punch != 0f)
            {
                _punchTime += dt;
                float x = Mathf.Clamp01((_punchTime / _punchDuration - 0.15f) / 0.85f);
                float e = x * x * (3f - 2f * x);
                _cam.fieldOfView = _baseFov - _punch * (1f - e);
                if (_punchTime >= _punchDuration) _punch = 0f;
            }
        }

        static float Noise(float x, float y) => Mathf.PerlinNoise(x + 17.3f, y + 3.1f) * 2f - 1f;
    }
}
