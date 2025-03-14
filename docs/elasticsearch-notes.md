# Elasticsearch 検索クエリのメモ

## 効果的な全文検索クエリの構造

Kibanaで効果的だった検索クエリの構造:

```json
{
  "query": {
    "bool": {
      "should": [
        {
          "match": {
            "post_text": {
              "query": "検索語",
              "operator": "and"
            }
          }
        },
        {
          "match": {
            "post_text.ngram": {
              "query": "検索語",
              "operator": "and"
            }
          }
        },
        {
          "match_phrase": {
            "post_text": {
              "query": "検索語",
              "boost": 2.0
            }
          }
        }
      ],
      "minimum_should_match": 1
    }
  }
}
```

## 各要素の役割

- **match + operator:and**: すべての単語が含まれる必要がある
- **match_phrase**: フレーズとして完全一致するとより高いスコアを得る（boost: 2.0）
- **post_text.ngram**: N-gram解析を使って日本語などのトークン分割が難しい言語に対応

## ワイルドカード検索の制限

単純なワイルドカード検索 (`*艦これ*`) はパフォーマンスが悪く、日本語のような複合文字に対して期待通りに動作しないことが多い。
全文検索には上記の組み合わせクエリを使用するのが望ましい。

## ソート順

基本的にはスコアでソートするのが検索結果としては自然だが、最新の投稿を優先したい場合は `post_createat: desc` を指定する。
