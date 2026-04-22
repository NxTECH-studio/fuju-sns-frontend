  ---                                      eqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq
  1. 役割分担（前提）

  lqqqqqqqqqqqqqqk  ①login/refresh      lqqqqqqqqqqqqqk
  x   Browser    x qqqqqqqqqqqqqqqqqqq> x   AuthCore  x (本リポ)
  x  (SNS SPA)   x <qqqqqqqqqqqqqqqqqqq x /v1/auth/** x
  mqqqqqqqqqqqqqqj  access_token        mqqqqqqqqqqqqqj
         x           + refresh_token cookie      ▲
         x ②Bearer <access_token>                x
P0+r\P0+r\P0+r\P0+r\P0+r\P0+r\P0+r\P0+r\P0+r\P0+r\         ▼                                       x ③introspect (Basic auth)
  lqqqqqqqqqqqqqqk                               x
  x  SNS Backend x qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqj
  x (別リポ)      x
  mqqqqqqqqqqqqqqj

  - 認証・ユーザー登録・MFA・ソーシャルログイン・トークン発行/回転は すべて AuthCore に集約する（SNS 側に認証ロジックを持たない）。
  - SNS バックエンドは リクエストごとに Bearer トークンを受け取り Introspection で検証するだけ。
  - SNS 側 DB では sub（ULID 26 文字）を外部キーにして内部ユーザーと紐付ける（README §3.1 の「不変な内部ID」契約）。

  ---
  2. 事前セットアップ：SNS を Client として登録

  AuthCore の clients テーブル（README §3.9, §4.2）に SNS 用の client_id / client_secret を発行しておく。SNS 側は環境変数で保持：

  # SNS バックエンド側 .env
  AUTHCORE_BASE_URL=https://auth.fuju.internal
  AUTHCORE_CLIENT_ID=sns-backend
  AUTHCORE_CLIENT_SECRET=********       # Argon2id で AuthCore 側に保存済み
  AUTHCORE_INTROSPECT_CACHE_TTL=30s     # 任意

  Secret は SNS バックエンドにのみ置き、ブラウザに渡さない（README §3.13.1）。                                                                                                                                                                
  qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq
  ---
  3. 実行時フロー

  3.1 ブラウザ → SNS への通常 API 呼び出し

  1. ブラウザは AuthCore から受け取った access_token を Authorization: Bearer <token> で SNS に送る。
  2. SNS は Introspection で有効性を問い合わせる。
  3. active: true なら sub をキーに SNS 側のユーザー行を引く（なければ lazy create）。
  4. mfa_verified が必要な操作（決済、アカウント削除等）は Claim を見て弾く。

  3.2 トークンの更新・ログアウト

  - 更新は AuthCore 直叩き。SNS は関知しない。ブラウザは POST {AUTHCORE}/v1/auth/refresh を credentials: 'include' で呼び、新 Access Token を受け取ってから SNS を再リクエスト。
  - ログアウトも AuthCore 側（POST /v1/auth/logout）。SNS は何もしない（Refresh Token cookie が Path=/v1/auth に限定されているため、SNS のオリジンには送られない）。

  ---
  4. SNS 側ミドルウェア実装例（Go）

  Introspection 結果は Redis に短時間キャッシュし、最低限の DoS 耐性と AuthCore への負荷軽減を両立する。

  // sns/middleware/authcore.go
  package middleware

  import (
        "context"
        "encoding/json"
        "fmt"
        "net/http"
        "net/url"
        "strings"
        "time"
  )

  type IntrospectResponse struct {
        Active      bool   `json:"active"`
        Sub         string `json:"sub,omitempty"`
        Username    string `json:"username,omitempty"`
        Exp         int64  `json:"exp,omitempty"`
        MFAVerified bool   `json:"mfa_verified"`
  }

  type AuthCoreClient struct {
        BaseURL      string
        ClientID     string
        ClientSecret string
        HTTP         *http.Client
        Cache        TokenCache // Redis 実装
  }

  func (a *AuthCoreClient) Introspect(ctx context.Context, token string) (*IntrospectResponse, error) {
        if v, ok := a.Cache.Get(ctx, token); ok {
                return v, nil
        }

        form := url.Values{}
        form.Set("token", token)
        form.Set("token_type_hint", "access_token")

        req, _ := http.NewRequestWithContext(ctx, "POST",
                a.BaseURL+"/v1/auth/introspect", strings.NewReader(form.Encode()))
        req.SetBasicAuth(a.ClientID, a.ClientSecret)
        req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

        res, err := a.HTTP.Do(req)
        if err != nil {
                return nil, err
        }
        defer res.Body.Close()

        if res.StatusCode == http.StatusUnauthorized { // CLIENT_INVALID 等は設定ミス
                return nil, fmt.Errorf("authcore rejected client credentials")
        }
        if res.StatusCode != http.StatusOK {
                return nil, fmt.Errorf("introspect failed: %d", res.StatusCode)
        }

        var r IntrospectResponse
        if err := json.NewDecoder(res.Body).Decode(&r); err != nil {
                return nil, err
        }

        // キャッシュ TTL は min(30s, exp - now) で打ち切る（早期失効優先）
        ttl := 30 * time.Second
        if r.Exp > 0 {
                if d := time.Until(time.Unix(r.Exp, 0)); d < ttl {
                        ttl = d
                }
        }
        if r.Active && ttl > 0 {
                a.Cache.Set(ctx, token, &r, ttl)
        }
        return &r, nil
  }

  type ctxKey struct{}

  type Principal struct {
        Sub         string
        Username    string
        MFAVerified bool
  }

  func PrincipalFrom(ctx context.Context) (Principal, bool) {
        p, ok := ctx.Value(ctxKey{}).(Principal)
        return p, ok
  }

  func (a *AuthCoreClient) RequireAuth(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                h := r.Header.Get("Authorization")
                if !strings.HasPrefix(h, "Bearer ") {
                        writeErr(w, http.StatusUnauthorized, "TOKEN_MALFORMED")
                        return
                }
                token := strings.TrimPrefix(h, "Bearer ")

                res, err := a.Introspect(r.Context(), token)
                if err != nil {
                        writeErr(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE")
                        return
                }
                if !res.Active {
                        writeErr(w, http.StatusUnauthorized, "TOKEN_INVALID")
                        return
                }

                ctx := context.WithValue(r.Context(), ctxKey{}, Principal{
                        Sub:         res.Sub,
                        Username:    res.Username,
                        MFAVerified: res.MFAVerified,
                })
                next.ServeHTTP(w, r.WithContext(ctx))
        })
  }

  // 高位権限操作用ガード（決済・アカウント削除など）
  func RequireMFA(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                p, ok := PrincipalFrom(r.Context())
                if !ok || !p.MFAVerified {
                        writeErr(w, http.StatusForbidden, "MFA_REQUIRED")
                        return
                }
                next.ServeHTTP(w, r)
        })
  }

  ルータ側はこうなる：

  mux := http.NewServeMux()
  mux.Handle("GET /posts",        auth.RequireAuth(postsHandler))
  mux.Handle("POST /posts",       auth.RequireAuth(createPostHandler))
  mux.Handle("DELETE /account",   auth.RequireAuth(middleware.RequireMFA(deleteAccountHandler)))

  ---
  5. SNS 側 DB スキーマ（ユーザー紐付け）

  AuthCore の sub を主キー相当で持つのがポイント：

  CREATE TABLE sns_users (
    auth_sub        CHAR(26)    PRIMARY KEY,   -- AuthCore の ULID。不変
    cached_username VARCHAR(16),                -- Public ID を UI 用に冗長保持（任意）
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    ...
  );

  CREATE TABLE posts (
    id        CHAR(26) PRIMARY KEY,
    author    CHAR(26) NOT NULL REFERENCES sns_users(auth_sub),
    body      TEXT     NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  - メールや Public ID を外部キーにしない。Public ID は変更可能（PATCH /v1/user/public_id）。
  - 初回アクセス時は Introspection の sub をもとに upsert（ON CONFLICT DO NOTHING）。
  - cached_username は UI 表示用の冗長キャッシュ。正は AuthCore なので、たまに /v1/user/profile もしくはイベント連携で同期する（今のところイベント機構はないので lazy 更新でよい）。

  ---
  6. ブラウザ側のフロー（CORS/Cookie の注意）

  SNS SPA が別オリジン（例: sns.example.com と auth.example.com）の場合：

  // ログイン（AuthCore に直接）
  await fetch("https://auth.example.com/v1/auth/login", {
    method: "POST",
    credentials: "include",              // refresh_token cookie を受け取るため必須
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  // SNS API 呼び出し
  await fetch("https://sns.example.com/posts", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Access Token 切れ → AuthCore に refresh                                                                                                                                                                                                  
  awaitqfetch("https://auth.example.com/v1/auth/refresh",q{qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq
    method: "POST",
    credentials: "include",              // cookie 自動送信
  });

  - AuthCore 側 ALLOWED_ORIGINS に SNS の origin を追加する必要はない（ブラウザは AuthCore に直接行くだけ）。
  - SNS の CORS は SNS バックエンド側で制御。Authorization ヘッダ許可だけ足りていればよい。

  ---
  7. 運用上の注意

  - mfa_verified: false を「MFA 未設定」と解釈しない（README §3.9）。MFA 強制が必要な画面は MFA_REQUIRED で弾いて、ブラウザ側で再ログイン or MFA verify をやり直させる。
  - キャッシュ TTL は 30 秒程度に抑える。Access Token の TTL が 15 分なので、revoke/logout から最大 30 秒で SNS 側にも反映される。厳密な即時無効化が必要な資金移動等はキャッシュをバイパスするオプションを足す。
  - レート制限：Introspection は 1000/min/Client（設計値、§3.8）。SNS のピーク RPS × 平均キャッシュ miss 率で見積もり、必要なら Client ごとに個別拡張を相談。
  - 障害時の挙動：AuthCore がダウンしたら SNS は 503 で失敗させる（fail-closed）。キャッシュ HIT 中は動作を続けられる。これはセキュリティ要件次第だが、認証基盤なので fail-open にはしない方が無難。
  - scope/権限：現状 scope は空文字で将来拡張用（README §3.6, §4.2）。SNS 側で細かな権限制御が要るなら、AuthCore に scope 発行機構を足すか、SNS 側で sub ベースのロールを別途管理するかの判断になる。

  ---
  8. 代替案：ローカル JWT 検証

  Introspection がボトルネックになる規模なら、SNS に公開鍵を配布してローカル検証する選択肢がある。ただし：

  - 現状 AuthCore は JWKS エンドポイントを公開していない（keys/jwt.public.pem を out-of-band で配る必要がある）。
  - ローカル検証だけでは revoke / logout が即時反映されない（Redis ブロックリストは AuthCore 側にしかない）。
  - 採るなら「ローカル検証で O(1) 通過 → 定期的に Introspection で同期 or ブロックリストを Pub/Sub で配信」の併用形。

  まずは Introspection + 短 TTL キャッシュで始め、負荷が問題になってから移行を検討するのが無難です。

  ---
  必要なら、SNS 側の具体的なフレームワーク（Echo / Gin / Fiber / 他言語）に合わせた実装例や、JWKS 公開エンドポイントを AuthCore に追加する設計案も出せます。

✻ Cooked for 1m 29s                   ns)

