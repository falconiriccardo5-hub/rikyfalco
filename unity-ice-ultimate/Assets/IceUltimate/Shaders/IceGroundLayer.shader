// Strato a terra (sigillo, brina, crepe, onda di gelo) su un Quad orizzontale.
// _Reveal fa crescere la texture dal centro con bordo frastagliato e luminoso.
Shader "IceUltimate/GroundLayer"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _NoiseTex ("Noise", 2D) = "gray" {}
        [HDR] _Color ("Color", Color) = (0.7, 0.86, 1, 1)
        _Intensity ("Intensity", Range(0, 20)) = 2
        _Reveal ("Reveal", Range(0, 1.2)) = 1
        _Fade ("Fade", Range(0, 1)) = 1
        _EdgeWidth ("Edge Width", Range(0, 0.5)) = 0.08
        _EdgeBoost ("Edge Boost", Range(0, 10)) = 3
        _NoiseAmount ("Noise Amount", Range(0, 0.5)) = 0.12
        _Rotation ("Rotation (rad)", Float) = 0
        _SpinSpeed ("Spin Speed (rad/s)", Float) = 0
        _PulseSpeed ("Pulse Speed (Hz)", Float) = 0
        _PulseAmount ("Pulse Amount", Range(0, 1)) = 0.25
        _Dissolve ("Dissolve", Range(0, 1)) = 0
    }
    SubShader
    {
        Tags { "Queue" = "Transparent" "RenderType" = "Transparent" "IgnoreProjector" = "True" "PreviewType" = "Plane" }
        Blend One One
        ZWrite Off
        Cull Off
        Offset -1, -1

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "IceCommon.cginc"

            sampler2D _MainTex;
            sampler2D _NoiseTex;
            float4 _Color;
            float _Intensity, _Reveal, _Fade, _EdgeWidth, _EdgeBoost, _NoiseAmount, _Rotation, _SpinSpeed, _PulseSpeed, _PulseAmount, _Dissolve;

            struct appdata { float4 vertex : POSITION; float2 uv : TEXCOORD0; };
            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                return o;
            }

            float4 frag(v2f i) : SV_Target
            {
                float4 tex = tex2D(_MainTex, IceRotateUV(i.uv, _Rotation + _Time.y * _SpinSpeed));
                float r = length(i.uv - 0.5) * 2.0;
                float n = tex2D(_NoiseTex, i.uv * 1.7).r;
                float front = _Reveal * (1.0 + _NoiseAmount) - n * _NoiseAmount;
                float m = smoothstep(front, front - 0.02, r);
                float edge = smoothstep(_EdgeWidth, 0.0, abs(r - front)) * step(0.001, _Reveal) * step(_Reveal, 1.0);
                float d = tex2D(_NoiseTex, i.uv * 2.3 + 0.37).g;
                float dm = smoothstep(_Dissolve, _Dissolve + 0.08, d);
                float pulse = 1.0 + sin(_Time.y * 6.2831853 * _PulseSpeed) * _PulseAmount * step(0.001, _PulseSpeed);
                float a = tex.a * (m + edge * _EdgeBoost * tex.a) * _Fade * dm * _Color.a;
                return float4(tex.rgb * _Color.rgb * _Intensity * pulse * a, 0);
            }
            ENDCG
        }
    }
}
