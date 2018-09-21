
import psycopg2

class db():
    def __init__(self):
        self.host = 'ccr-db.cgvmdhergfnh.us-east-1.rds.amazonaws.com'
        self.password = 'ccr_user1'
        self.user = 'ccr_user'
        self.database = 'cc_recommender'
        self.port = '5432'
        self.conn_str = 'host={0} port={1} dbname={2} user={3} password={4}'.format(self.host, self.port, self.database, self.user, self.password)
        self.CONNECTION = None
    def open_connection(self):
        self.CONNECTION = psycopg2.connect(self.conn_str)
    def close_connection(self):
        self.CONNECTION.close()
    def get_cards(self):
        self.open_connection()
        cursor = self.CONNECTION.cursor()
        cursor.execute("""SELECT * from cards""")
        cards = cursor.fetchall()
        cursor.close()
        self.close_connection()
       
        return cards
    def get_issuers(self):
        self.open_connection()
        cursor = self.CONNECTION.cursor()
        cursor.execute("""SELECT * from issuers""")
        issuers = cursor.fetchall()
        cursor.close()
        self.close_connection()
        return [issuer[1].lower() for issuer in issuers]
    def card_in_database(self,card_name):
        cursor = conn.cursor()
        cursor.execute('SELECT name FROM cards WHERE name = {}'.format(card_name))
        return cur.fetchone() is not None
    #def insert_review(reviews):

    def insert_reviews(reviews):
        cursor = conn.cursor()
        args_str = ','.join(cur.mogrify("(%s,%s,%s,%s,%s,%s,%s,%s,%s)", review) for review in reviews)
        cur.execute("INSERT INTO old_reviews VALUES " + args_str) 
    