# Enhanced Tab Manager

## Supported Languages

| Stable  | Unstable (Beta) |
| ------- | --------------- |
| EN / JA | -               |

> For correction requests, visit [Issues](https://github.com/otnc/enhanced-tab-manager/issues).

## Key Features

- **Auto Grouping**: Automatically groups tabs based on URLs or custom patterns.
- **Save & Close**: Save memory by saving all current tabs and closing them instantly.
- **Restore**: Restore saved tabs anytime you need them.
- **Customization**: Ignore specific protocols, subdomains (www), or query parameters for cleaner grouping.
- **Privacy**: No tracking. All data is stored locally in your browser.

## Description

<details>
  <summary>English</summary>
  <strong>Take control of your browser tabs.</strong><br>
  Enhanced Tab Manager automatically organizes your messy tabs into groups based on domain names or custom rules.<br>
  You can also "Save & Close" all open tabs to free up memory and restore them later from the popup list.<br>
  Ensuring fast performance without tracking your data.<br>
  We are open to feedback! Please feel free to open an issue on GitHub.
</details>
<details>
  <summary>日本語</summary>
  <strong>ブラウザのタブを、もっと自由に管理しよう。</strong><br>
  Enhanced Tab Managerは、ドメイン名やカスタムルールに基づいて、散らばったタブを自動的にグループ化して整理します。<br>
  また、「すべてのタブを保存して閉じる」機能を使えば、メモリを解放しつつ、後でリストから簡単にタブを復元できます。<br>
  データの外部送信やトラッキングは一切行いません。<br>
  フィードバックはGithubのIssuesで受け付けています。機能の要望があればお気軽にどうぞ！
</details>

<div style="text-align: center;">
  <img src="icons/128x128.png" alt="Logo" style="display: block; width: auto; height: 128px; margin: 0 auto;">
</div>

## Pattern Matching Rules / パターンマッチングの仕様

You can use the following patterns to define group rules.
グループの定義には以下のパターン記法が使用できます。

| Pattern / 記法     | Description / 説明                                                                                                 | Match Example / 一致         | No-Match / 不一致                   |
| :----------------- | :----------------------------------------------------------------------------------------------------------------- | :--------------------------- | :---------------------------------- |
| **`word`**         | **Smart Partial Match (Default)**<br>Matches whole words/domains only.<br>単語境界を考慮した部分一致（デフォルト） | `word.com`<br>`sub.word.org` | `sword.com`<br>`keywords.net`       |
| **`"exact.com"`**  | **Exact Match**<br>Matches the entire URL/Domain perfectly.<br>完全一致                                            | `exact.com`                  | `sub.exact.com`<br>`exact.com/path` |
| **`prefix*`**      | **Starts With**<br>Matches the beginning of the string.<br>前方一致                                                | `prefix-test.com`            | `my-prefix.com`                     |
| **`*suffix`**      | **Ends With**<br>Matches the end of the string.<br>後方一致                                                        | `test.suffix`                | `suffix.test`                       |
| **`*.domain.com`** | **Subdomain Wildcard**<br>Matches subdomains only.<br>サブドメインのみ一致                                         | `blog.domain.com`            | `domain.com`<br>`other.com`         |
| **`domain.*`**     | **TLD Wildcard**<br>Matches any Top Level Domain.<br>TLDワイルドカード                                             | `domain.com`<br>`domain.jp`  | `my-domain.com`                     |

> [!Note]
> Before matching, URLs are normalized based on your settings (e.g., removing `https://`, `www.`, or query parameters).
> マッチングの前に、設定に基づいてURLの正規化（`https://`や`www.`の削除など）が行われます。

### Download

- ~~Chrome Webstore~~
- [GitHub Releases](https://github.com/otnc/enhanced-tab-manager/releases)

## Get Support

If you have any questions or found a bug, please open an issue on GitHub.
