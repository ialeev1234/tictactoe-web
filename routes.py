from flask import Blueprint, redirect, request, abort, render_template
from flask_login import login_required, login_user, logout_user, current_user

from models import User, db

tracking = Blueprint("tracking", __name__)


@tracking.route('/')
def main_page():
    return render_template('main.html', current_user=current_user)


@tracking.route("/logout")
@login_required
def logout():
    user = current_user
    user.authenticated = False
    db.session.add(user)
    db.session.commit()
    logout_user()
    return redirect("/")


@tracking.route("/login", methods=["GET", "POST"])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user:
            if user.authenticated:
                return abort(403, description="Already authenticated")
            if password != user.password:
                return abort(401, description="Invalid password")
            user.authenticated = True
        else:
            user = User()
            user.username = username
            user.password = password
        db.session.add(user)
        db.session.commit()
        if user.id:
            login_user(user)
        return redirect("/")
