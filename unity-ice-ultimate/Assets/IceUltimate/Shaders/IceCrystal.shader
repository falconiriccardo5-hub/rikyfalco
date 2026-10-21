// Cristallo di ghiaccio: trasparente, bordi fresnel, facce sfaccettate,
// dissoluzione con bordo luminoso e flash emissivo all'apparizione.
// La crescita degli spuntoni la fa lo script CrystalCluster (scala per spuntone).
Shader "IceUltimate/Crystal"
{
    Properties
    {
        _NoiseTex ("Noise", 2D) = "gray" {}
        [HDR] _Tint ("Tint", Color) = (0.7, 0.85, 1, 1)
        [HDR] _EdgeColor ("Edge Color", Color) = (0.85, 0.95, 1, 1)
        _Opacity ("Opacity", Range(0, 1)) = 0.35
        _FresnelPower ("Fresnel Power", Range(0.5, 8)) = 2
        _Emission ("Emission", Range(0, 20)) = 2
        _Dissolve ("Dissolve", Range(0, 1)) = 0
        _DissolveEdge ("Dissolve Edge", Range(0, 0.3)) = 0.08
        _Flash ("Flash", Range(0, 10)) = 0
        _LightDir ("Fake Light Dir", Vector) = (0.3, 0.8, -0.5, 0)
    }
    SubShader
    {
        Tags { "Queue" = "Transparent" "RenderType" = "Transparent" "IgnoreProjector" = "True" }
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite On
        Cull Back

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "IceCommon.cginc"

            sampler2D _NoiseTex;
            float4 _Tint, _EdgeColor, _LightDir;
            float _Opacity, _FresnelPower, _Emission, _Dissolve, _DissolveEdge, _Flash;

            struct appdata { float4 vertex : POSITION; float3 normal : NORMAL; float2 uv : TEXCOORD0; };
            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; float3 normal : TEXCOORD1; float3 viewDir : TEXCOORD2; };

            v2f vert(appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                o.normal = UnityObjectToWorldNormal(v.normal);
                o.viewDir = WorldSpaceViewDir(v.vertex);
                return o;
            }

            float4 frag(v2f i) : SV_Target
            {
                float3 nrm = normalize(i.normal);
                float ndv = saturate(dot(nrm, normalize(i.viewDir)));
                float fres = pow(1.0 - ndv, _FresnelPower);
                float n = tex2D(_NoiseTex, i.uv * float2(1.0, 3.0)).r;
                float cut = n - _Dissolve * 1.1;
                clip(cut);
                float burn = smoothstep(_DissolveEdge, 0.0, cut) * step(0.001, _Dissolve);
                float facet = 0.55 + 0.45 * abs(dot(nrm, normalize(_LightDir.xyz)));
                float3 col = _Tint.rgb * 0.25 * facet
                    + _EdgeColor.rgb * (fres * fres * _Emission + burn * 6.0 + _Flash * facet)
                    + _Tint.rgb * 0.06 * _Emission * i.uv.y * facet;
                float a = saturate(_Opacity + fres * 0.6 + burn + saturate(_Flash * 0.2));
                return float4(col, a);
            }
            ENDCG
        }
    }
}
