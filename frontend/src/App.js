import React, { Component } from "react";
import firebase from "./firebase";
import { getPrivateMessage } from "./api";

import TagCloud from "react-tag-cloud";
import randomColor from "randomcolor";

// const API_ENDPOINT = process.env.BACKEND_API_BASE;

const styles = {
  large: {
    fontSize: 60,
    fontWeight: "bold",
    fontFamily: "sans-serif",
    color: () =>
      randomColor({
        hue: "blue"
      }),
    padding: 5
  },
  small: {
    opacity: 0.7,
    fontSize: 16
  }
};

const successHandler = function(text) {
  const lists = JSON.parse(text);
  console.log(lists);
  const items = [];
  for (let i = 0; i < lists.length; i++) {
    // console.log(lists[i]);
    items.push(
      <div className="top_style">
        <div className="article_title">{lists[i].title}</div>
        <div className="article_body">{lists[i].body}</div>
        <div className="article_tag">
          #{lists[i].tag}hoge #{lists[i].tag}fuga #{lists[i].tag}piyo
        </div>
      </div>
    );
  }

  return items;
};
const errorHandler = function(error) {
  return error.message;
};
//  -------------------------------------------------------- //

const successPaperHandler = function(text) {
  const lists = JSON.parse(text);
  console.log(lists);
  const items = [];
  for (let i = 1; i < Object.keys(lists).length; i++) {
    items.push(
      <div className="top_style">
        <div className="article_title">{lists[i][0]}</div>
        <div className="article_body">{lists[i][2]}</div>
        <div className="article_tag">
          #{lists[i][3]} #{lists[i][4]} #{lists[i][5]}
        </div>
      </div>
    );
  }

  return items;
};
//  -------------------------------------------------------- //

const successTagHandler = function(text) {
  const lists = JSON.parse(text);
  const keywords = [];
  for (var key in lists) {
    if (lists[key] === 1) {
      // console.log(key, 1);
      keywords.push(
        <div style={styles.small} className="text_center">
          {key}
        </div>
      );
    } else if (lists[key] > 2) {
      // console.log(key, 2);
      keywords.push(<div className="text_center">{key}</div>);
    } else {
      // console.log(key, 3);
      keywords.push(
        <div style={styles.large} className="text_center">
          {key}
        </div>
      );
    }
  }
  // eact-tag-cloud -> https://github.com/IjzerenHein/react-tag-cloud
  // 試す場所 -> https://stackblitz.com/edit/react-tag-cloud?file=App.js
  return keywords;
};

function request(method, url) {
  return fetch(url).then(function(res) {
    if (res.ok) {
      if (res.status === 200 && method === "PUT") {
        return "success!!";
      }

      try {
        JSON.parse(res);
        return res.json();
      } catch (error) {
        return res.text();
      }
    }
    if (res.status < 500) {
      throw new Error("4xx error");
    }
    throw new Error("5xx error");
  });
}
const tag_first = [];
tag_first.push(
  <div style={styles.small} className="text_center">
    <div style={styles.large}>3D関心領域</div>
    <div style={{ fontFamily: "courier" }}>Corelデータセット</div>
    <div style={styles.large}>Webアノテーション</div>
    <div style={{ fontSize: 30 }}>ゆるい注釈</div>
    <div style={{ fontStyle: "italic" }}>アナログセグメンテーション</div>
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
  </div>
);
class App extends Component {
  constructor() {
    super();
    this.state = {
      user: null,
      message: "",
      errorMessage: "",
      token: "",
      cloud: tag_first
    };
  }

  async getToken() {
    if (this.state.token === "") {
      this.state.token = await firebase.auth().currentUser.getIdToken();
    }
  }

  getPrivateMessage() {
    this.state.user
      .getIdToken()
      .then(token => {
        return getPrivateMessage(token);
      })
      .then(resp => {
        this.setState({
          message: resp.message
        });
      })
      .catch(error => {
        this.setState({
          errorMessage: error.toString()
        });
      });
  }

  getAllArticles() {
    request("GET", "http://localhost:1991/articles")
      .then(resp => {
        this.setState({
          message: successHandler(resp)
        });
      })
      .catch(error => {
        this.setState({
          errorMessage: errorHandler(error)
        });
      });
  }

  getAllTags() {
    request("GET", "http://localhost:1991/tags")
      .then(resp => {
        // const tags = [];
        // var tagDB = JSON.parse(resp);
        // for (let i = 0; i < tagDB.length; i++) {
        //   tags.push(tagDB[i].tag);
        // }
        // console.log(tags.join(","));

        this.setState({
          message: successTagHandler(resp)
        });
      })
      .catch(error => {
        // console.log(error);
        this.setState({
          errorMessage: errorHandler(error)
        });
      });
  }

  async getPapers() {
    await this.getToken();
    return fetch(`http://localhost:1991/articles/paper`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.state.token}`
      },
      body: JSON.stringify({ title: "ok", body: "google" })
    })
      .then(resp => {
        console.log(resp);
        this.setState({
          message: successPaperHandler(resp)
        });
      })
      .catch(error => {
        this.setState({
          errorMessage: errorHandler(error)
        });
      });
  }

  async deleteArticles() {
    await this.getToken();

    return fetch(`http://localhost:1991/articles`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.state.token}`
      }
    });
  }

  async postArticles() {
    await this.getToken();
    return fetch(`http://localhost:1991/articles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.state.token}`
      },
      body: JSON.stringify({ title: "ok", body: "google" })
    });
  }

  handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      console.log(e.target.value, "ok");

      const params = new URLSearchParams();
      params.set("keyword", e.target.value);

      request("GET", "http://localhost:1991/paper?" + params.toString())
        .then(resp => {
          console.log("success");
          this.setState({
            message: successPaperHandler(resp)
          });
        })
        .catch(error => {
          console.log("fail");
          this.setState({
            errorMessage: errorHandler(error)
          });
        });
    }
  }

  componentDidMount() {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        console.log(JSON.stringify(user));
        console.log(this.state);
        this.setState({ user });
      }
    });
    setInterval(() => {
      this.forceUpdate();
    }, 3000);
  }

  render(props, state) {
    if (this.state.user === null) {
      return <button onClick={firebase.login}>Please login</button>;
    }

    return (
      <div>
        <h2 className="title word">
          <a className="title" href="/">
            Arxiv Cloud
          </a>
        </h2>

        <div className="search-form">
          <textarea
            className="search-text"
            placeholder="Search"
            // onChange={this.handleChange.bind(this)}
            onKeyDown={this.handleKeyDown.bind(this)}
          />
          <img src="search.png" alt="search icon" className="search-icon" />
        </div>

        <div className="app-outer">
          <div className="app-inner">
            <TagCloud
              className="tag-cloud "
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
              {this.state.cloud}
            </TagCloud>
          </div>
        </div>

        <div className="state_messages">{this.state.message}</div>
        <div className="button_div">
          <p className="state_err_message">{this.state.errorMessage}</p>
          {/* <button onClick={this.getPrivateMessage.bind(this)}>
            Get Private Message
          </button> */}
          <button onClick={this.getAllArticles.bind(this)}>List message</button>
          <button onClick={this.getAllTags.bind(this)}>List Tag</button>
          {/* <button onClick={this.postArticles.bind(this)}>Post</button> */}
          <button onClick={this.deleteArticles.bind(this)}>Delete All</button>
          <button onClick={firebase.logout}>Logout</button>
        </div>
      </div>
    );
  }
}

export default App;
