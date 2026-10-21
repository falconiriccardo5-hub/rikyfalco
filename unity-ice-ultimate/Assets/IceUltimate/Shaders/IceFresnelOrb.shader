// Bolla/sfera di energia: bordo fresnel, flusso di rumore interno, iridescenza.
Shader "IceUltimate/FresnelOrb"
{
    Properties
    {
        _NoiseTex ("Noise", 2D) = "gray" {}
        [HDR] _RimColor ("Rim Color", Color) = (0.85, 0.95, 1, 1)
        [HDR] _CoreColor ("Core Color", Color) = (0.35, 0.55, 0.85, 1)
        _Intensity ("Intensity", Range(0, 20)) = 2
        _RimPower ("Rim Power", Range(0.5, 8)) = 2.5
        _CoreAmount ("Core Amount", Range(0, 2)) = 0.35
        _FlowSpeed ("Flow Speed", Float) = 0.35
        _Iridescence ("Iridescence", Range(0, 1)) = 0.35
        _Fade ("Fade", Range(0, 1)) = 1
    }
    SubShader
    {
        Tags { "Queue" = "Transparent" "RenderType" = "Transparent" "IgnoreProjector" = "True" }
        Blend One One
        ZWrite Off
        Cull Back

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "IceCommon.cginc"

            sampler2D _NoiseTex;
            float4 _RimColor, _CoreColor;
            float _Intensity, _RimPower, _CoreAmount, _FlowSpeed, _Iridescence, _Fade;

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
                float ndv = saturate(dot(normalize(i.normal), normalize(i.viewDir)));
                float rim = pow(1.0 - ndv, _RimPower);
                float t = _Time.y * _FlowSpeed;
                float n = tex2D(_NoiseTex, i.uv * float2(3.0, 1.5) + float2(t, -t * 0.6)).r;
                float n2 = tex2D(_NoiseTex, i.uv * 5.0 - float2(t * 0.7, 0.0)).g;
                float swirl = smoothstep(0.45, 0.8, n * n2 * 2.0);
                float3 irid = 0.5 + 0.5 * cos(6.2831853 * (float3(0.0, 0.33, 0.67) + rim * 1.5 + _Time.y * 0.2));
                float3 rimc = lerp(_RimColor.rgb, _RimColor.rgb * irid * 1.4, _Iridescence);
                float3 col = rimc * rim + _CoreColor.rgb * (_CoreAmount * swirl + _CoreAmount * 0.25);
                return float4(col * _Intensity * _Fade, 0);
            }
            ENDCG
        }
    }
}
