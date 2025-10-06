import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Wordle Deck';
    const words = searchParams.get('words') || '0';
    const description = searchParams.get('description') || '';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            fontFamily: 'system-ui',
          }}
        >
          {/* 상단 그라데이션 배경 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '200px',
              background: 'linear-gradient(180deg, #3b82f6 0%, transparent 100%)',
              opacity: 0.3,
            }}
          />
          
          {/* 메인 컨텐츠 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px',
              textAlign: 'center',
              maxWidth: '900px',
              zIndex: 1,
            }}
          >
            {/* 로고/아이콘 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '120px',
                height: '120px',
                backgroundColor: '#3b82f6',
                borderRadius: '24px',
                marginBottom: '40px',
                boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  color: 'white',
                }}
              >
                W
              </div>
            </div>

            {/* 제목 */}
            <h1
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                color: 'white',
                margin: '0 0 20px 0',
                lineHeight: '1.1',
                textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              {title}
            </h1>

            {/* 설명 */}
            {description && (
              <p
                style={{
                  fontSize: '32px',
                  color: '#94a3b8',
                  margin: '0 0 30px 0',
                  lineHeight: '1.4',
                  maxWidth: '800px',
                }}
              >
                {description}
              </p>
            )}

            {/* 단어 개수 표시 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '2px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '16px',
                padding: '16px 32px',
                marginTop: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  color: '#3b82f6',
                  fontWeight: '600',
                }}
              >
                {words}개 단어
              </div>
            </div>

            {/* 하단 텍스트 */}
            <div
              style={{
                position: 'absolute',
                bottom: '60px',
                left: '60px',
                right: '60px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  color: '#64748b',
                  fontWeight: '500',
                }}
              >
                wordledecks
              </div>
              <div
                style={{
                  fontSize: '24px',
                  color: '#64748b',
                }}
              >
                지금 플레이하세요
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.log(`${error instanceof Error ? error.message : 'Unknown error'}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
