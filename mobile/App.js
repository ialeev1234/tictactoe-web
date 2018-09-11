import React from 'react';
import { StyleSheet, View, Button } from 'react-native';
import { Table, Row } from 'react-native-table-component';


function Square(props) {
  return ( <Button style={styles.square} onPress={props.onClick} title={props.value} /> );
}

class Board extends React.Component {
  renderSquare(i) {
    return ( <Square value={this.props.squares[i]} onClick={() => this.props.onClick(i)} /> );
  }

  render() {
    return (
      <View>
        <View style={styles.boardRow}>
          {this.renderSquare(0)}
          {this.renderSquare(1)}
          {this.renderSquare(2)}
        </View>
        <View style={styles.boardRow}>
          {this.renderSquare(3)}
          {this.renderSquare(4)}
          {this.renderSquare(5)}
        </View>
        <View style={styles.boardRow}>
          {this.renderSquare(6)}
          {this.renderSquare(7)}
          {this.renderSquare(8)}
        </View>
      </View>
    );
  }
}

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      squares: Array(9).fill(null),
      xIsNext: true,
      odata: {},
      udata: {},
      waiting: false
    };
  }

  componentDidMount() {
    const self = this;
    this.socket = io.connect('http://localhost:5000');
    this.socket.on('connect', function() {
      self.socket.emit('hi');
    });
    this.socket.on('waiting', function() {
      setTimeout(function() {
        return self.socket.emit('hi')
      }, 1000);
    });
    this.socket.on('playing', function(data) {
      self.setState(self.updateData(data));
      self.calcStatus();
      self.useState(data.state);
      if (self.state.waiting) {
        self.waiting();
      }
    });
    this.socket.on('response', function(data) {
      if (data.state === self.state.state) {
        setTimeout(function() {
          return self.waiting()
        }, 1000);
      } else {
        self.useState(data.state);
        self.checkEnd();
      }
    });
  }

  useState(state){
    if (state) {
      for (let i = 0; i < this.state.squares.length; i++) {
        this.state.squares[i] = state[i] === ' ' ? null : state[i];
      }
    }
    this.state.xIsNext = state ? (state.match(/X/g) || []).length === (state.match(/O/g) || []).length : true;
    this.state.waiting = (this.state.udata.name === this.state.O) ? this.state.xIsNext : !this.state.xIsNext;
  }

  calcPercents(data) {
    const result = {
      played: data.wins + data.losses + data.draws,
      name: data.name,
      pwins: '-',
      plosses: '-',
      pdraws: '-'
    };
    if (result.played) {
      result.pwins = Math.round(data.wins / result.played * 10000) / 100;
      result.plosses = Math.round(data.losses / result.played * 10000) / 100;
      result.pdraws = Math.round(data.draws / result.played * 10000) / 100;
    }
    return result
  }

  updateData(data) {
    if (data.state) { this.useState(data.state); }
    data.udata = this.calcPercents(data.udata);
    data.odata = this.calcPercents(data.odata);
    data.playingMode = true;
    return data;
  }

  sendState(winner, finished){
    let state = '', loserId;
    for (let i = 0; i < this.state.squares.length; i++) {
      state += this.state.squares[i] || ' ';
    }
    if (finished){
      if (winner === this.state.udata.name) { loserId = this.state.oid }
      else if (winner === this.state.odata.name) { loserId = this.state.uid }
    }
    this.socket.emit('moved', {
      gid: this.state.gid,
      finished: finished,
      loser_id: loserId,
      state: state
    });
    this.state.state = state;
  }

  calculateWinner(squares) {
    let winner;
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        winner = this.state[squares[a]];
      }
    }
    return winner;
  }

  checkEnd() {
    this.state.end = this.state.squares.every(function (el) { return el; });
    this.state.winner = this.calculateWinner(this.state.squares);
    this.calcStatus();
  }

  calcStatus () {
    if (!this.state.winner && !this.state.end) {
      this.setState({status: (this.state.xIsNext ? this.state.X : this.state.O) + "'s move."});
    } else {
      this.setState({status: (
        this.state.winner ? "Winner: " + this.state.winner : "Friendship (Draw)"
      ) + ". Refresh page for new game."});
    }
  }

  waiting(){
    if (this.state.oid === 0) {
      let emptyIndexes = this.state.squares.map(function(val, index){
        return val === null ? index : null;
      });
      let emptySquares = emptyIndexes.filter(function (el) { return el !== null; });
      this.handleMove(emptySquares[Math.floor(Math.random() * emptySquares.length)], true);
      this.state.waiting = false;
    } else {
      this.socket.emit('request', {gid: this.state.gid})
    }
  }

  handleMove(i, isAI) {
    if (this.state.waiting && !isAI || this.state.winner || this.state.squares[i]) { return; }
    this.state.squares[i] = this.state.xIsNext ? "X" : "O";
    this.state.xIsNext = !this.state.xIsNext;
    this.checkEnd();
    if (!this.state.winner && !this.state.end) {
      this.sendState();
      if (!isAI) {
        this.state.waiting = true;
        this.waiting();
      }
    } else {
      this.sendState(this.state.winner, true);
    }
  }

  render() {
    if (this.state.playingMode) {
      return (
        <View>
          <Table style={styles.table}>
            <Row data={['Username', this.state.udata.name, this.state.odata.name]} />
            <Row data={['Wins(%)', this.state.udata.pwins, this.state.odata.pwins]} />
            <Row data={['Losses(%)', this.state.udata.plosses, this.state.odata.plosses]} />
            <Row data={['Draws(%)', this.state.udata.pdraws, this.state.odata.pdraws]} />
            <Row data={['Games', this.state.udata.played, this.state.odata.played]} />
          </Table>
          <View style={styles.gameBoard}>
            <Board squares={this.state.squares} onClick={i => this.handleMove(i)} />
          </View>
          <View style={styles.gameInfo}>
            <View style={[styles.margin5, padding5]}>{this.state.xIsNext}{this.state.waiting}{this.state.status}</View>
          </View>
        </View>
      );
    } else {
      return (<View>Please wait...</View>);
    }
  }
}

export default class App extends React.Component {
  render() {
    return (
      <View style={styles.container}>
        <Game />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    // backgroundColor: '#fff',
    // alignItems: 'center',
    // justifyContent: 'center',
  },
  table: {
    // width: 250
  },
  margin5: {margin: 5},
  padding5: {padding: 5},
  boardRow: {
    clear: 'both',
    content: "",
    display: 'table'
  },
  gameInfo: {
    fontWeight: 'bold'
  },
  square: {
    background: '#fff',
    border: '1px solid #999',
    float: 'left',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 34,
    height: 34,
    marginRight: -1,
    marginTop: -1,
    padding: 0,
    textAlign: 'center',
    width: 34
  }
});
