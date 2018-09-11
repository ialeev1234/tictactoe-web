import random
import time

from flask_login import current_user
from sqlalchemy import or_

from models import db, Game, UserGameStat


class WaitingPlayer:
    id = ts = None

    def clear(self, uid_ctrl=None):
        if not uid_ctrl or uid_ctrl and uid_ctrl == self.id:
            self.ts = self.id = None


waiting_player = WaitingPlayer()


def collect_game_data(opponent_uid=0, game=None):
    if not game:
        uid_list = [current_user.id, opponent_uid]
        user1_id = random.choice(uid_list)
        uid_list.remove(user1_id)
        game = Game(
            user1_id=user1_id,
            user2_id=uid_list[0],
        )
        db.session.add(game)
        db.session.commit()

    return {
        'gid': game.id,
        'uid': current_user.id,
        'oid': opponent_uid,
        'udata': collect_user_data(),
        'odata': collect_user_data(opponent_uid),
        'state': game.state,
        'X': game.user1.username,
        'O': game.user2.username
    }


def collect_user_data(uid=None):
    stat = get_user_game_stat(uid)
    return {
        'name': stat.user.username,
        'wins': stat.wins,
        'losses': stat.losses,
        'draws': stat.draws
    }


def check_queue(uid):
    result = waiting_player.id
    if not result:
        waiting_player.id = uid
        waiting_player.ts = time.time()
    return result


def get_oid_from_game(game, uid=None):
    if uid is None:
        uid = current_user.id
    return game.user2_id if game.user1_id == uid else game.user1_id


def get_user_game_stat(uid=None):
    if uid is None:
        uid = current_user.id
    stat = UserGameStat.query.get(uid)
    if not stat:
        stat = UserGameStat(user_id=uid)
        db.session.add(stat)
        db.session.commit()
    return stat


def get_started_game(uid=None):
    if uid is None:
        uid = current_user.id
    return Game.query.filter(
        Game.finished.is_(False),
        or_(
            Game.user1_id == uid,
            Game.user2_id == uid
        )
    ).first()


def finish_game(state=None, loser=None):
    started_game = get_started_game()
    if started_game and not started_game.finished:
        if state:
            started_game.state = state
        started_game.finished = True
        oid = get_oid_from_game(started_game)
        ustat = get_user_game_stat()
        ostat = get_user_game_stat(uid=oid)
        if loser is not None:
            if loser == current_user.id:
                started_game.winner_id = oid
                ustat.losses += 1
                ostat.wins += 1
            else:
                started_game.winner_id = current_user.id
                ustat.wins += 1
                ostat.losses += 1
        else:
            ustat.draws += 1
            ostat.draws += 1
        db.session.commit()
