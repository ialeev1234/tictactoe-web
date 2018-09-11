import time
from logging import INFO

from flask import Flask, Response, g
from flask_login import LoginManager, current_user, user_logged_out, login_required
from flask_socketio import SocketIO, emit

from config import WAITING_TIME
from helpers import (
    check_queue, waiting_player, get_started_game, collect_game_data,
    get_oid_from_game, finish_game
)
from models import User, db, Game
from routes import tracking

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tictactoe.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = True
app.config['ENV'] = 'development'

app.logger.setLevel(INFO)

app.register_blueprint(tracking)

socketio = SocketIO(app)

db.app = app
db.init_app(app)
db.create_all()

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'tracking.login'


@app.before_request
def before_request():
    g.user = current_user


@app.errorhandler(401)
def page_not_found(e):
    return Response(f'{e}')


@login_manager.user_loader
def load_user(uid):
    return User.query.get(uid) if uid != 'None' else None


@socketio.on('hi')
@login_required
def hi_handler():
    cur_user_id = current_user.id
    started_game = get_started_game()
    if started_game:
        opponent_uid = get_oid_from_game(started_game)
        emit('playing', collect_game_data(opponent_uid, started_game))
    else:
        opponent_uid = check_queue(cur_user_id)
        if opponent_uid and opponent_uid != cur_user_id:
            waiting_player.clear()
            emit('playing', collect_game_data(opponent_uid))
        elif opponent_uid == cur_user_id and time.time() - waiting_player.ts > WAITING_TIME:
            waiting_player.clear()
            emit('playing', collect_game_data())
        else:
            emit('waiting')


@socketio.on('moved')
@login_required
def moved_handler(json):
    if 'finished' in json:
        finish_game(state=json['state'], loser=json.get('loser_id'))
    else:
        game = Game.query.get(json['gid'])
        game.state = json['state']
        db.session.commit()


@socketio.on('request')
@login_required
def request_handler(json):
    emit('response', {'state': Game.query.get(json['gid']).state})


@user_logged_out.connect_via(app)
def _after_logout_hook(sender, user, **extra):
    waiting_player.clear(uid_ctrl=user.id)
    finish_game(loser=user.id)
