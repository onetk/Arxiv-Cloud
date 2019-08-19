import React, { Component } from "react";
import randomColor from "randomcolor";
import TagCloud from "react-tag-cloud";
import CloudItem from "./CloudItem";

const styles = {
  large: {
    fontSize: 60,
    fontWeight: "bold"
  },
  small: {
    opacity: 0.7,
    fontSize: 16
  }
};

class App extends Component {
  componentDidMount() {
    setInterval(() => {
      this.forceUpdate();
    }, 3000);
  }

  render() {
    return (
      <div className="app-outer">
        <div className="app-inner">
          <TagCloud
            className="tag-cloud"
            style={{
              fontFamily: "sans-serif",
              //fontSize: () => Math.round(Math.random() * 50) + 16,
              fontSize: 30,
              color: () =>
                randomColor({
                  hue: "blue"
                }),
              padding: 5
            }}
          >
            <div style={styles.large}>3D関心領域</div>
            <div style={{ fontFamily: "courier" }}>Corelデータセット</div>
            <div style={styles.large}>Webアノテーション</div>
            <div style={{ fontSize: 30 }}>ゆるい注釈</div>
            <div style={{ fontStyle: "italic" }}>
              アナログセグメンテーション
            </div>
            <div style={{ color: "green" }}>エッジ検出セグメンテーション</div>
            <div>テキストアノテーション</div>
            <div>CNN</div>
            <div>クラスタリング</div>
            <div style={styles.small}>オープンアノテーション用</div>
            <div style={styles.small}>テキスト注釈</div>
            <div style={styles.small}>トピックモデル</div>
            <div style={styles.small}>パフォーマンス</div>
            <div>公開Webアーカイブ</div>
            <div>医療画像処理</div>
          </TagCloud>
        </div>
      </div>
    );
  }
}

export default App;
