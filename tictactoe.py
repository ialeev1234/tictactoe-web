from app import app, socketio
from models import db, User

app.secret_key = 'super secret key'

if __name__ == '__main__':
    app.config['SESSION_TYPE'] = 'filesystem'

    user0 = User.query.get(0) or User(id=0, username='AI', password='AI')

    db.session.add(user0)
    db.session.commit()

    socketio.run(app, host='0.0.0.0')
