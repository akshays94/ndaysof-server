open_db_container:
	@echo '-------------------------------'
	@echo 'Opening postgres container ...'
	@echo '-------------------------------'
	docker container exec -it ndaysof-server_mydb_1 bash

open_testdb_container:
	@echo '-------------------------------'
	@echo 'Opening postgres test db container ...'
	@echo '-------------------------------'
	docker container exec -it ndaysof-server_mytestdb_1 bash	

up:
	docker-compose up	

qup:
	docker-compose up -d
	docker-compose logs --tail=100 --follow	

logs:
	docker-compose logs --tail=100 --follow	
		