// Funzioni comuni agli shader dell'Ice Ultimate.
// Gli shader sono "unlit" senza LightMode: funzionano sia nella Built-in
// Render Pipeline sia in URP (passaggio SRPDefaultUnlit).
#ifndef ICE_COMMON_INCLUDED
#define ICE_COMMON_INCLUDED

#include "UnityCG.cginc"

// Posizione in clip space di un vertice di un quad orientato verso la camera.
// `spin` ruota lo sprite nel piano dello schermo (radianti).
float4 IceBillboardClipPos(float4 vertex, float spin)
{
    float3 center = mul(unity_ObjectToWorld, float4(0, 0, 0, 1)).xyz;
    float2 scale = float2(length(unity_ObjectToWorld._m00_m10_m20), length(unity_ObjectToWorld._m01_m11_m21));
    float s = sin(spin);
    float c = cos(spin);
    float2 p = float2(vertex.x * c - vertex.y * s, vertex.x * s + vertex.y * c) * scale;
    float3 right = UNITY_MATRIX_V[0].xyz;
    float3 up = UNITY_MATRIX_V[1].xyz;
    float3 world = center + right * p.x + up * p.y;
    return mul(UNITY_MATRIX_VP, float4(world, 1.0));
}

float2 IceRotateUV(float2 uv, float angle)
{
    float2 p = uv - 0.5;
    float s = sin(angle);
    float c = cos(angle);
    return float2(p.x * c - p.y * s, p.x * s + p.y * c) + 0.5;
}

#endif
